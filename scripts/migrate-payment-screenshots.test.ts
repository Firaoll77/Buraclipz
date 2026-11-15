import { describe, it, expect } from "vitest";
import {
  isPublicIp,
  classifySource,
  detectImageKind,
  expectedPublicIdFor,
  isFinalizableRecord,
  assertSafeRemoteUrl,
  resolveBuffer,
} from "./migrate-payment-screenshots";
import { checkMigratedAsset } from "../src/lib/cloudinary";

// Minimal valid image fixtures (magic bytes only — content irrelevant)
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const GIF = Buffer.from("GIF89a____", "ascii");

describe("isPublicIp — SSRF IP classification", () => {
  it.each([
    "127.0.0.1", "10.0.0.5", "192.168.1.1", "172.16.0.1", "172.31.255.1",
    "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "240.0.0.1",
    "192.0.2.1", "198.51.100.1", "203.0.113.1", "198.18.0.1",
    "::1", "fc00::1", "fd12::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.1.2.3",
  ])("blocks non-public IP %s", (ip) => {
    expect(isPublicIp(ip)).toBe(false);
  });

  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700:4700::1111"])(
    "allows public IP %s",
    (ip) => {
      expect(isPublicIp(ip)).toBe(true);
    }
  );
});

describe("assertSafeRemoteUrl — URL-level SSRF checks", () => {
  it("rejects malformed URLs", async () => {
    await expect(assertSafeRemoteUrl("not a url")).rejects.toThrow();
  });

  it("rejects non-HTTPS schemes", async () => {
    await expect(assertSafeRemoteUrl("http://example.com/x.jpg")).rejects.toThrow(/HTTPS/);
    await expect(assertSafeRemoteUrl("file:///etc/passwd")).rejects.toThrow();
  });

  it("rejects localhost and internal hostnames", async () => {
    await expect(assertSafeRemoteUrl("https://localhost/x.jpg")).rejects.toThrow();
    await expect(assertSafeRemoteUrl("https://foo.internal/x.jpg")).rejects.toThrow();
    await expect(assertSafeRemoteUrl("https://printer.lan/x.jpg")).rejects.toThrow();
    await expect(assertSafeRemoteUrl("https://metadata/x.jpg")).rejects.toThrow(); // single-label
  });

  it("rejects private/loopback IP literals without DNS", async () => {
    await expect(assertSafeRemoteUrl("https://127.0.0.1/x.jpg")).rejects.toThrow(/blocked IP/);
    await expect(assertSafeRemoteUrl("https://169.254.169.254/latest")).rejects.toThrow(/blocked IP/);
    await expect(assertSafeRemoteUrl("https://[::1]/x.jpg")).rejects.toThrow(/blocked IP/);
  });

  it("accepts a public IP literal (no DNS needed)", async () => {
    const url = await assertSafeRemoteUrl("https://8.8.8.8/image.jpg");
    expect(url.hostname).toBe("8.8.8.8");
  });
});

describe("detectImageKind — magic-byte detection", () => {
  it("detects JPEG", () => expect(detectImageKind(JPEG)).toBe("jpeg"));
  it("detects PNG", () => expect(detectImageKind(PNG)).toBe("png"));
  it("rejects GIF and arbitrary bytes", () => {
    expect(detectImageKind(GIF)).toBeNull();
    expect(detectImageKind(Buffer.from("plain text"))).toBeNull();
  });
});

describe("classifySource — legacy value classification", () => {
  it("classifies data URLs", () => {
    expect(classifySource("data:image/png;base64,iVBOR").kind).toBe("data-url");
  });
  it("rejects malformed data URLs", () => {
    expect(classifySource("data:image/png").kind).toBe("unsupported");
  });
  it("rejects non-HTTPS remote URLs", () => {
    const r = classifySource("http://example.com/x.jpg");
    expect(r.kind).toBe("unsupported");
    expect(r.skipReason).toMatch(/HTTPS/);
  });
  it("classifies HTTPS remote URLs", () => {
    expect(classifySource("https://cdn.example.com/x.jpg").kind).toBe("remote-url");
  });
  it("rejects malformed remote URLs", () => {
    expect(classifySource("https://").kind).toBe("unsupported");
  });
  it("accepts safe /uploads/ filenames", () => {
    expect(classifySource("/uploads/1234-receipt.jpg").kind).toBe("local-upload");
  });
  it.each(["/uploads/../secret", "/uploads/a/b.jpg", "/uploads/", "/uploads/.hidden/../x"])(
    "rejects unsafe /uploads/ path %s",
    (v) => {
      expect(classifySource(v).kind).toBe("unsupported");
    }
  );
  it("rejects arbitrary strings", () => {
    expect(classifySource("javascript:alert(1)").kind).toBe("unsupported");
    expect(classifySource("/etc/passwd").kind).toBe("unsupported");
    expect(classifySource("").kind).toBe("unsupported");
  });
});

describe("expectedPublicIdFor / isFinalizableRecord — finalize safety", () => {
  const apptId = "clxyz123abc";
  const goodId = expectedPublicIdFor(apptId);

  it("derives deterministic folder-scoped IDs", () => {
    expect(goodId).toBe(`barber/payment-screenshots/migration-${apptId}`);
  });

  it("finalizes only exact deterministic references", () => {
    expect(isFinalizableRecord({ id: apptId, paymentPublicId: goodId })).toBe(true);
  });

  it.each([
    null,
    "",
    "   ",
    "barber/payment-screenshots/some-other-id",
    "barber/payment-screenshots/migration-other",
    goodId + " ",
  ])("refuses to finalize unsafe paymentPublicId %j", (pid) => {
    expect(isFinalizableRecord({ id: apptId, paymentPublicId: pid })).toBe(false);
  });
});

describe("checkMigratedAsset — metadata verification", () => {
  const sha = "a".repeat(64);
  const valid = {
    public_id: "barber/payment-screenshots/migration-abc",
    resource_type: "image",
    type: "authenticated",
    context: { custom: { migration_appointment_id: "abc", migration_sha256: sha } },
  };

  it("accepts a fully matching asset", () => {
    expect(checkMigratedAsset(valid, sha, "abc")).toBeNull();
  });

  it("rejects wrong resource_type", () => {
    expect(
      checkMigratedAsset({ ...valid, resource_type: "video" }, sha, "abc")
    ).toMatch(/not an image/);
  });

  it("rejects non-authenticated delivery type", () => {
    expect(
      checkMigratedAsset({ ...valid, type: "upload" }, sha, "abc")
    ).toMatch(/not authenticated/);
  });

  it("rejects appointment_id mismatch", () => {
    expect(checkMigratedAsset(valid, sha, "different-id")).toMatch(/appointment_id mismatch/);
  });

  it("rejects sha256 mismatch", () => {
    expect(checkMigratedAsset(valid, "b".repeat(64), "abc")).toMatch(/sha256 mismatch/);
  });

  it("rejects missing context metadata", () => {
    expect(
      checkMigratedAsset({ ...valid, context: undefined }, sha, "abc")
    ).toMatch(/appointment_id mismatch/);
  });

  it("rejects missing or malformed sha256 metadata", () => {
    const noSha = {
      ...valid,
      context: { custom: { migration_appointment_id: "abc" } },
    };
    expect(checkMigratedAsset(noSha, sha, "abc")).toMatch(/sha256 mismatch/);
    const badSha = {
      ...valid,
      context: {
        custom: { migration_appointment_id: "abc", migration_sha256: "not-a-hash" },
      },
    };
    expect(checkMigratedAsset(badSha, sha, "abc")).toMatch(/sha256 mismatch/);
  });
});

describe("resolveBuffer — finalize re-verification inputs", () => {
  const pngDataUrl = `data:image/png;base64,${PNG.toString("base64")}`;

  it("decodes a valid image data URL to bytes for hash recomputation", async () => {
    const classified = classifySource(pngDataUrl);
    const res = await resolveBuffer(pngDataUrl, classified);
    expect(res.buffer?.equals(PNG)).toBe(true);
    expect(res.skipReason).toBeUndefined();
  });

  it("refuses data URLs whose bytes are not JPEG/PNG/WebP", async () => {
    const v = `data:image/png;base64,${GIF.toString("base64")}`;
    const res = await resolveBuffer(v, classifySource(v));
    expect(res.buffer).toBeUndefined();
    expect(res.skipReason).toMatch(/JPEG\/PNG\/WebP/);
  });

  it("refuses malformed data URLs", async () => {
    const v = "data:image/png;base64,!!!notbase64!!!";
    // "!!!" decodes to garbage bytes — must fail magic-byte check
    const res = await resolveBuffer(v, { kind: "data-url" });
    expect(res.buffer === undefined || res.skipReason !== undefined).toBe(true);
  });

  it("propagates skip reasons for unsupported classifications", async () => {
    const v = "notaurl";
    const res = await resolveBuffer(v, classifySource(v));
    expect(res.buffer).toBeUndefined();
  });
});
