import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, type JwtPayload } from "@/lib/jwt";

function getAccessToken(request: NextRequest) {
  const cookieToken = request.cookies.get("access_token")?.value;

  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return null;
}

export function getUnauthorizedResponse(
  message = "Unauthorized: Login is required.",
) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status: 401 },
  );
}

export function authenticateRequest(request: NextRequest):
  | { payload: JwtPayload; token: string }
  | { response: NextResponse } {
  const token = getAccessToken(request);

  if (!token) {
    return { response: getUnauthorizedResponse() };
  }

  try {
    const payload = verifyAccessToken(token);
    return { payload, token };
  } catch {
    return {
      response: getUnauthorizedResponse(
        "Unauthorized: Invalid or expired session.",
      ),
    };
  }
}
