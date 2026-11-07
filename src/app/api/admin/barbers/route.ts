import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAllBarbers } from "@/lib/data-store";

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const barbers = await getAllBarbers();
    return NextResponse.json({ barbers });
  } catch (error: any) {
    console.error("Error fetching barbers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch barbers" },
      { status: 500 }
    );
  }
}
