import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { NextResponse } from "next/server";
import { signAccessToken } from "@/lib/jwt";
import { getAuthCookieOptions } from "@/lib/session";
import { PendingRegistration } from "@/models/PendingRegistration";
import { User } from "@/models/User";

export type GoogleClientType = "web" | "extension";

type GoogleIdentity = {
  email: string;
  googleId: string;
  name: string | null;
};

type GoogleCodeExchangeParams = {
  code: string;
  codeVerifier: string;
  redirectUri: string;
};

type GoogleTokenExchangeResponse = {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function getFallbackName(email: string) {
  return email.split("@")[0] || "Google User";
}

export function getAllowedGoogleAudiences(clientType: GoogleClientType) {
  const audiences = new Set<string>();

  if (process.env.GOOGLE_CLIENT_ID) {
    audiences.add(process.env.GOOGLE_CLIENT_ID);
  }

  if (clientType === "extension" && process.env.GOOGLE_EXTENSION_CLIENT_ID) {
    audiences.add(process.env.GOOGLE_EXTENSION_CLIENT_ID);
  }

  return Array.from(audiences);
}

export function getConfiguredGoogleRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI?.trim() || null;
}

export function validateGoogleRedirectUri(redirectUri: string) {
  const configuredRedirectUri = getConfiguredGoogleRedirectUri();

  if (!configuredRedirectUri) {
    return "Google auth redirect URI is not configured.";
  }

  let parsedRedirectUri: URL;
  let parsedConfiguredRedirectUri: URL;

  try {
    parsedRedirectUri = new URL(redirectUri);
    parsedConfiguredRedirectUri = new URL(configuredRedirectUri);
  } catch {
    return "redirectUri must be a valid absolute URL.";
  }

  if (parsedRedirectUri.toString() !== parsedConfiguredRedirectUri.toString()) {
    return "redirectUri does not match the configured Google redirect URI.";
  }

  return null;
}

function normalizeGoogleIdentity(payload: TokenPayload | undefined) {
  const email = payload?.email?.trim().toLowerCase();
  const googleId = payload?.sub;
  const googleName = payload?.name?.trim() || null;
  const issuer = payload?.iss;
  const expiresAt = payload?.exp;
  const emailVerified = payload?.email_verified === true;

  if (!email || !googleId || !emailVerified) {
    throw new Error("Google account email is not verified or token is invalid.");
  }

  if (!issuer || !GOOGLE_ISSUERS.has(issuer)) {
    throw new Error("Google token issuer is invalid.");
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (!expiresAt || expiresAt <= nowInSeconds) {
    throw new Error("Google token has expired.");
  }

  return {
    email,
    googleId,
    name: googleName,
  } satisfies GoogleIdentity;
}

export async function verifyGoogleIdToken(idToken: string, clientType: GoogleClientType) {
  const allowedAudiences = getAllowedGoogleAudiences(clientType);

  if (allowedAudiences.length === 0) {
    throw new Error("Google auth is not configured.");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: allowedAudiences,
  });

  const payload = ticket.getPayload();
  const identity = normalizeGoogleIdentity(payload);

  if (!allowedAudiences.includes(payload?.aud || "")) {
    throw new Error("Google token audience is invalid.");
  }

  return identity;
}

export async function exchangeGoogleAuthorizationCode({
  code,
  codeVerifier,
  redirectUri,
}: GoogleCodeExchangeParams) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("Google auth is not configured.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as GoogleTokenExchangeResponse | null;

  if (!response.ok) {
    const message =
      payload?.error_description ||
      payload?.error ||
      "Google authorization code exchange failed.";
    throw new Error(message);
  }

  const idToken = payload?.id_token?.trim();

  if (!idToken) {
    throw new Error("Google token response did not include an ID token.");
  }

  return {
    idToken,
  };
}

export async function findOrCreateUserFromGoogleIdentity(identity: GoogleIdentity) {
  const { email, googleId, name } = identity;

  let user = await User.findOne({ email });

  if (user) {
    if (user.googleId && user.googleId !== googleId) {
      return {
        errorResponse: NextResponse.json(
          {
            success: false,
            message: "This email is already linked with a different Google account.",
          },
          { status: 409 },
        ),
      };
    }

    if (!user.googleId) {
      user.googleId = googleId;

      if (!user.name && name) {
        user.name = name;
      }

      await user.save();
    }

    return { user };
  }

  const pendingRegistration = await PendingRegistration.findOne({ email });

  if (pendingRegistration) {
    user = await User.create({
      name: pendingRegistration.name || name || getFallbackName(email),
      email,
      passwordHash: pendingRegistration.passwordHash,
      googleId,
    });

    await PendingRegistration.deleteOne({ _id: pendingRegistration._id });

    return { user };
  }

  user = await User.create({
    name: name || getFallbackName(email),
    email,
    passwordHash: null,
    googleId,
  });

  return { user };
}

export function createGoogleAuthSuccessResponse(user: InstanceType<typeof User>) {
  const token = signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    name: user.name,
  });

  const response = NextResponse.json({
    success: true,
    message: "Signed in with Google.",
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    },
  });

  response.cookies.set("access_token", token, getAuthCookieOptions());

  return response;
}

export function getGoogleAuthErrorResponse(error: unknown, fallbackMessage: string) {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (
    message === "Google account email is not verified or token is invalid." ||
    message === "Google token issuer is invalid." ||
    message === "Google token has expired." ||
    message === "Google token audience is invalid." ||
    message === "Google token response did not include an ID token."
  ) {
    return NextResponse.json({ success: false, message }, { status: 400 });
  }

  if (message === "Google auth is not configured.") {
    return NextResponse.json({ success: false, message }, { status: 500 });
  }

  if (
    message === "invalid_grant" ||
    message === "invalid_request" ||
    message === "unauthorized_client" ||
    message === "unsupported_grant_type"
  ) {
    return NextResponse.json(
      { success: false, message: "Google authorization code exchange failed." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { success: false, message: fallbackMessage },
    { status: 500 },
  );
}
