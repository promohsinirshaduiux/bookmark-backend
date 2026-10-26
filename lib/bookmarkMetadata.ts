import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_REDIRECTS = 5;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;

export type BookmarkMetadataResult = {
  title: string | null;
  description: string | null;
  iconUrl: string | null;
  siteName: string | null;
  previewImage: string | null;
  metadataStatus: "ready" | "failed";
  reachabilityStatus: "reachable" | "unreachable";
};

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase().split("%")[0];

  if (isIP(normalized) === 4) {
    const parts = normalized.split(".").map(Number);
    const [first, second] = parts;

    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      first >= 224
    );
  }

  if (isIP(normalized) === 6) {
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb") ||
      normalized.startsWith("ff")
    );
  }

  return true;
}

async function assertSafePublicUrl(rawUrl: string) {
  const url = new URL(rawUrl);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs can be checked.");
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Local network URLs cannot be checked.");
  }

  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });

  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private network URLs cannot be checked.");
  }

  return url;
}

async function fetchWithSafeRedirects(rawUrl: string) {
  let currentUrl = rawUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    await assertSafePublicUrl(currentUrl);

    const response = await fetch(currentUrl, {
      redirect: "manual",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }

    const location = response.headers.get("location");

    if (!location) return response;
    if (redirectCount === MAX_REDIRECTS) {
      throw new Error("Too many redirects.");
    }

    await response.body?.cancel();
    currentUrl = new URL(location, currentUrl).toString();
  }

  throw new Error("Too many redirects.");
}

function getTagAttribute(tag: string, attribute: string) {
  const expression = new RegExp(
    `(?:^|\\s)${attribute}\\s*=\\s*(?:["']([^"']*)["']|([^\\s>]+))`,
    "i",
  );
  const match = tag.match(expression);
  return (match?.[1] ?? match?.[2])?.trim();
}

function getMetaContent(html: string, key: string) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const name = getTagAttribute(tag, "name");
    const property = getTagAttribute(tag, "property");

    if (name?.toLowerCase() === key.toLowerCase() || property?.toLowerCase() === key.toLowerCase()) {
      return getTagAttribute(tag, "content");
    }
  }

  return undefined;
}

function getTitle(html: string) {
  return html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
}

function getFaviconHref(html: string) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = getTagAttribute(tag, "rel")?.toLowerCase() ?? "";

    if (rel.split(/\s+/).some((value) => ["icon", "shortcut", "apple-touch-icon"].includes(value))) {
      return getTagAttribute(tag, "href");
    }
  }

  return undefined;
}

function toAbsoluteUrl(baseUrl: string, value?: string) {
  if (!value) return null;

  try {
    const url = new URL(value, baseUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

async function readLimitedText(response: Response) {
  const declaredLength = Number(response.headers.get("content-length"));

  if (Number.isFinite(declaredLength) && declaredLength > MAX_HTML_BYTES) {
    throw new Error("Response is too large.");
  }

  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesRead += value.byteLength;
    if (bytesRead > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("Response is too large.");
    }

    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

function fallbackMetadata(url: string): BookmarkMetadataResult {
  const hostname = new URL(url).hostname.replace(/^www\./, "");

  return {
    title: hostname,
    description: null,
    siteName: hostname,
    iconUrl: `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=64`,
    previewImage: null,
    metadataStatus: "ready",
    reachabilityStatus: "reachable",
  };
}

export async function fetchBookmarkMetadata(rawUrl: string): Promise<BookmarkMetadataResult> {
  try {
    const response = await fetchWithSafeRedirects(rawUrl);
    const finalUrl = response.url || rawUrl;

    if (!response.ok) {
      if ([400, 401, 403, 405, 429].includes(response.status)) {
        return fallbackMetadata(finalUrl);
      }

      return {
        title: null,
        description: null,
        iconUrl: null,
        siteName: null,
        previewImage: null,
        metadataStatus: "failed",
        reachabilityStatus: "unreachable",
      };
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType && !contentType.includes("html") && !contentType.includes("xml")) {
      return fallbackMetadata(finalUrl);
    }

    const html = await readLimitedText(response);
    const fallback = fallbackMetadata(finalUrl);
    const siteName =
      getMetaContent(html, "og:site_name") ??
      getMetaContent(html, "application-name") ??
      fallback.siteName;

    return {
      title:
        getMetaContent(html, "og:title") ??
        getMetaContent(html, "twitter:title") ??
        getTitle(html) ??
        siteName,
      description:
        getMetaContent(html, "description") ??
        getMetaContent(html, "og:description") ??
        getMetaContent(html, "twitter:description") ??
        null,
      siteName,
      iconUrl:
        toAbsoluteUrl(finalUrl, getFaviconHref(html) ?? "/favicon.ico") ??
        fallback.iconUrl,
      previewImage: toAbsoluteUrl(
        finalUrl,
        getMetaContent(html, "og:image") ??
          getMetaContent(html, "twitter:image"),
      ),
      metadataStatus: "ready",
      reachabilityStatus: "reachable",
    };
  } catch {
    return {
      title: null,
      description: null,
      iconUrl: null,
      siteName: null,
      previewImage: null,
      metadataStatus: "failed",
      reachabilityStatus: "unreachable",
    };
  }
}
