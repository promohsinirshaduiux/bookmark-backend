import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import {
  createGoogleAuthSuccessResponse,
  exchangeGoogleAuthorizationCode,
  findOrCreateUserFromGoogleIdentity,
  getGoogleAuthErrorResponse,
  validateGoogleRedirectUri,
  verifyGoogleIdToken,
} from "@/lib/google-auth";

type GoogleCodeAuthBody = {
  code?: string;
  codeVerifier?: string;
  redirectUri?: string;
  clientType?: "web";
};

function isValidCodeVerifier(codeVerifier: string) {
  return /^[A-Za-z0-9\-._~]{43,128}$/.test(codeVerifier);
}

export async function POST(request: Request) {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { success: false, message: "Google auth is not configured." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as GoogleCodeAuthBody;
    const code = body.code?.trim();
    const codeVerifier = body.codeVerifier?.trim();
    const redirectUri = body.redirectUri?.trim();
    const clientType = body.clientType === "web" ? "web" : null;

    if (!code || !codeVerifier || !redirectUri) {
      return NextResponse.json(
        {
          success: false,
          message: "code, codeVerifier, and redirectUri are required.",
        },
        { status: 400 },
      );
    }

    if (!clientType) {
      return NextResponse.json(
        {
          success: false,
          message: "clientType must be 'web' for Google authorization code login.",
        },
        { status: 400 },
      );
    }

    if (!isValidCodeVerifier(codeVerifier)) {
      return NextResponse.json(
        {
          success: false,
          message: "codeVerifier must be 43-128 characters and use PKCE-safe characters.",
        },
        { status: 400 },
      );
    }

    const redirectUriValidationError = validateGoogleRedirectUri(redirectUri);

    if (redirectUriValidationError) {
      return NextResponse.json(
        {
          success: false,
          message: redirectUriValidationError,
        },
        { status: redirectUriValidationError.includes("configured") ? 500 : 400 },
      );
    }

    const { idToken } = await exchangeGoogleAuthorizationCode({
      code,
      codeVerifier,
      redirectUri,
    });
    const identity = await verifyGoogleIdToken(idToken, clientType);

    await connectToDatabase();

    const result = await findOrCreateUserFromGoogleIdentity(identity);

    if ("errorResponse" in result) {
      return result.errorResponse;
    }

    return createGoogleAuthSuccessResponse(result.user);
  } catch (error) {
    console.error("Google authorization code auth API error:", error);

    return getGoogleAuthErrorResponse(
      error,
      "Something went wrong while signing in with Google.",
    );
  }
}
