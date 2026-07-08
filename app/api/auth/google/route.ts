import { OAuth2Client } from "google-auth-library";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { signAccessToken } from "@/lib/jwt";
import { getAuthCookieOptions } from "@/lib/session";
import { PendingRegistration } from "@/models/PendingRegistration";
import { User } from "@/models/User";

type GoogleAuthBody = {
  idToken?: string;
  clientType?: "web" | "extension";
};

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function getAllowedGoogleAudiences(clientType: GoogleAuthBody["clientType"]) {
  const audiences = new Set<string>();

  if (process.env.GOOGLE_CLIENT_ID) {
    audiences.add(process.env.GOOGLE_CLIENT_ID);
  }

  if (clientType === "extension" && process.env.GOOGLE_EXTENSION_CLIENT_ID) {
    audiences.add(process.env.GOOGLE_EXTENSION_CLIENT_ID);
  }

  return Array.from(audiences);
}

function getFallbackName(email: string) {
  return email.split("@")[0] || "Google User";
}

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
    const allowedAudiences = getAllowedGoogleAudiences(clientType);

    if (!idToken) {
      return NextResponse.json(
        { success: false, message: "idToken is required." },
        { status: 400 },
      );
    }

    if (allowedAudiences.length === 0) {
      return NextResponse.json(
        { success: false, message: "Google auth is not configured." },
        { status: 500 },
      );
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: allowedAudiences,
    });

    const payload = ticket.getPayload();
    const email = payload?.email?.trim().toLowerCase();
    const emailVerified = payload?.email_verified === true;
    const googleId = payload?.sub;
    const googleName = payload?.name?.trim();

    if (!email || !googleId || !emailVerified) {
      return NextResponse.json(
        {
          success: false,
          message: "Google account email is not verified or token is invalid.",
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    let user = await User.findOne({ email });

    if (user) {
      if (user.googleId && user.googleId !== googleId) {
        return NextResponse.json(
          {
            success: false,
            message: "This email is already linked with a different Google account.",
          },
          { status: 409 },
        );
      }

      if (!user.googleId) {
        user.googleId = googleId;

        if (!user.name && googleName) {
          user.name = googleName;
        }

        await user.save();
      }
    } else {
      const pendingRegistration = await PendingRegistration.findOne({ email });

      if (pendingRegistration) {
        user = await User.create({
          name: pendingRegistration.name || googleName || getFallbackName(email),
          email,
          passwordHash: pendingRegistration.passwordHash,
          googleId,
        });

        await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
      } else {
        user = await User.create({
          name: googleName || getFallbackName(email),
          email,
          passwordHash: null,
          googleId,
        });
      }
    }

    const token = signAccessToken({
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const responseBody = {
      success: true,
      message: "Google login successful.",
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    };

    const response = NextResponse.json(responseBody);

    response.cookies.set("access_token", token, getAuthCookieOptions());

    return response;
  } catch (error) {
    console.error("Google auth API error:", error);

    return NextResponse.json(
      { success: false, message: "Something went wrong while logging in with Google." },
      { status: 500 },
    );
  }
}
