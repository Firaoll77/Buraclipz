import { NextResponse } from "next/server";
import { getAllServices } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const services = await getAllServices();
    return NextResponse.json({ services }, {
      headers: { "Cache-Control": "no-store, max-age=0" }
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}
