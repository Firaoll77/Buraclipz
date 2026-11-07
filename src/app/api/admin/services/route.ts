import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAllServicesForAdmin, createService } from "@/lib/data-store";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET /api/admin/services
export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const services = await getAllServicesForAdmin();
    return NextResponse.json({ services }, {
      headers: { "Cache-Control": "no-store, max-age=0" }
    });
  } catch (error: any) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch services" },
      { status: 500 }
    );
  }
}

const ServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  durationMinutes: z.number().int().min(5).max(480),
  priceEtb: z.number().min(0),
});

// POST /api/admin/services
export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = ServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const newService = await createService({
      name: data.name,
      description: data.description || null,
      durationMinutes: data.durationMinutes,
      priceEtb: data.priceEtb,
      isActive: true,
    });

    return NextResponse.json({ service: newService }, {
      status: 201,
      headers: { "Cache-Control": "no-store, max-age=0" }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Bad request" }, { status: 400 });
  }
}
