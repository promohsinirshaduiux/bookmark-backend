import { NextRequest, NextResponse } from "next/server";

function getAllowedOrigins() {
  return (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getCorsHeaders(request: NextRequest) {
  const requestOrigin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();
  const allowOrigin =
    requestOrigin && allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0] ?? "";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods":
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    Vary: "Origin",
  };
}

export function applyCorsHeaders(
  request: NextRequest,
  response: NextResponse,
) {
  const headers = getCorsHeaders(request);

  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      response.headers.set(key, value);
    }
  }

  return response;
}
