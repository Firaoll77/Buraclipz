import { describe, it, expect } from "vitest";
import { validateEthiopianPhone, formatEthiopianPhone, isEthiopianPhone } from "../phone";
import { toEthiopianDate, formatDualDate, formatETB, isEthiopianLeapYear } from "../ethiopian-calendar";

describe("Ethiopian Phone Validation & Formatting", () => {
  it("should validate and normalize standard Ethio Telecom +251 9... numbers", () => {
    const res1 = validateEthiopianPhone("+251911234567");
    expect(res1.isValid).toBe(true);
    expect(res1.normalized).toBe("+251911234567");
    expect(res1.formatted).toBe("+251 91 123 4567");

    const res2 = validateEthiopianPhone("0911 234 567");
    expect(res2.isValid).toBe(true);
    expect(res2.normalized).toBe("+251911234567");
    expect(res2.formatted).toBe("+251 91 123 4567");

    const res3 = validateEthiopianPhone("912345678");
    expect(res3.isValid).toBe(true);
    expect(res3.normalized).toBe("+251912345678");
  });

  it("should validate Safaricom Ethiopia +251 7... numbers", () => {
    const res = validateEthiopianPhone("+251 701 234 567");
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe("+251701234567");
    expect(res.formatted).toBe("+251 70 123 4567");
  });

  it("should reject non-Ethiopian or invalid format numbers", () => {
    // US number
    expect(validateEthiopianPhone("+14155552671").isValid).toBe(false);
    // Ethiopian landline (+251 11...)
    expect(validateEthiopianPhone("+251111234567").isValid).toBe(false);
    // Too short
    expect(validateEthiopianPhone("0911234").isValid).toBe(false);
    // Non-numeric
    expect(validateEthiopianPhone("invalid-phone").isValid).toBe(false);
  });

  it("should format phone helper cleanly", () => {
    expect(formatEthiopianPhone("0911223344")).toBe("+251 91 122 3344");
    expect(isEthiopianPhone("+251911223344")).toBe(true);
  });
});

describe("Ethiopian Calendar & Currency Context", () => {
  it("should correctly convert Gregorian date to Ethiopian date", () => {
    // September 11, 2024 is Meskerem 1, 2017 in Ethiopian Calendar
    const sep11_2024 = new Date(2024, 8, 11); // Month is 0-indexed, 8 = Sept
    const eth = toEthiopianDate(sep11_2024);
    expect(eth.month).toBe(1);
    expect(eth.monthName).toBe("Meskerem");
    expect(eth.day).toBe(1);
    expect(eth.year).toBe(2017);
    expect(eth.formatted).toBe("Meskerem 1, 2017 E.C.");
  });

  it("should correctly identify Ethiopian leap years", () => {
    // Ethiopian leap year occurs when (year + 1) % 4 === 0
    expect(isEthiopianLeapYear(2015)).toBe(true);
    expect(isEthiopianLeapYear(2016)).toBe(false);
  });

  it("should format dual date output", () => {
    const date = new Date(2024, 8, 11);
    const dual = formatDualDate(date);
    expect(dual.combined).toContain("Meskerem 1, 2017 E.C.");
  });

  it("should format ETB currency correctly according to prompt requirements", () => {
    expect(formatETB(500)).toBe("500 ETB");
    expect(formatETB(350)).toBe("350 ETB");
    expect(formatETB(1200)).toBe("1,200 ETB");
  });
});

