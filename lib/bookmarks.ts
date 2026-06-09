export function normalizeBookmarkUrl(input: string) {
  const trimmed = input.trim();
  const parsed = new URL(trimmed);

  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();

  if (
    (parsed.protocol === "https:" && parsed.port === "443") ||
    (parsed.protocol === "http:" && parsed.port === "80")
  ) {
    parsed.port = "";
  }

  if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  parsed.searchParams.sort();

  return parsed.toString();
}
