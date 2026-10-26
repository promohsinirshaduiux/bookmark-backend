import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import {
  createGoogleAuthSuccessResponse,
  findOrCreateUserFromGoogleIdentity,
  getGoogleAuthErrorResponse,
  verifyGoogleIdToken,
  type GoogleClientType,
} from "@/lib/google-auth";

type GoogleAuthBody = {
  idToken?: string;
  clientType?: GoogleClientType;
};

export async function POST(request: Request) {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { success: false, message: "Google auth is not configured." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as GoogleAuthBody;
    const idToken = body.idToken?.trim();
    const clientType = body.clientType === "extension" ? "extension" : "web";

    if (!idToken) {
      return NextResponse.json(
        { success: false, message: "idToken is required." },
        { status: 400 },
      );
    }

    const identity = await verifyGoogleIdToken(idToken, clientType);

    await connectToDatabase();

    const result = await findOrCreateUserFromGoogleIdentity(identity);

    if ("errorResponse" in result) {
      return result.errorResponse;
    }

    return createGoogleAuthSuccessResponse(result.user);
  } catch (error) {
    console.error("Google auth API error:", error);

    return getGoogleAuthErrorResponse(
      error,
      "Something went wrong while signing in with Google.",
    );
  }
}
