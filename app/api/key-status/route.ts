import { NextResponse } from "next/server";
import { getApiKeyPoolStatus } from "@/lib/api-key-pool";

export async function GET() {
  // This endpoint intentionally returns metadata only, never API key values.
  return NextResponse.json(await getApiKeyPoolStatus());
}
