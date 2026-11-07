import { NextResponse } from "next/server";
import { getAllBarbers } from "@/lib/data-store";

export async function GET() {
  try {
    const barbers = await getAllBarbers();
    return NextResponse.json({ barbers });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch barbers" }, { status: 500 });
  }
}

