import { NextResponse } from "next/server";
import { getAuthCookieOptions } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logout successful.",
  });

  response.cookies.set("access_token", "", getAuthCookieOptions(0));

  return response;
}
