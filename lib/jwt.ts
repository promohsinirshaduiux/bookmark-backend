import jwt from "jsonwebtoken";

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "7d") as jwt.SignOptions["expiresIn"];

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET in environment variables.");
  }
  return secret;
}

export type JwtPayload = {
  sub: string;
  email: string;
  name: string;
};

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}
