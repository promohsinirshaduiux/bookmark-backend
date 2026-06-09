type CookieSameSite = "lax" | "strict" | "none";

function getCookieSameSite(): CookieSameSite {
  if (process.env.COOKIE_SAME_SITE === "none") {
    return "none";
  }

  if (process.env.COOKIE_SAME_SITE === "strict") {
    return "strict";
  }

  return "lax";
}

export function getAuthCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 7) {
  const sameSite = getCookieSameSite();

  return {
    httpOnly: true,
    secure: sameSite === "none" || process.env.NODE_ENV === "production",
    sameSite,
    path: "/",
    maxAge: maxAgeSeconds,
  } as const;
}
