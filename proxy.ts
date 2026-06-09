import { NextRequest, NextResponse } from "next/server";
import { applyCorsHeaders } from "@/lib/cors";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      return applyCorsHeaders(request, new NextResponse(null, { status: 204 }));
    }

    return applyCorsHeaders(request, NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
