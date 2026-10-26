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

type BookmarkTagRecord = {
  _id: { toString(): string };
  name: string;
  color: string;
};

export type BookmarkRecord = {
  _id: { toString(): string };
  url: string;
  title?: string | null;
  description?: string | null;
  iconUrl?: string | null;
  siteName?: string | null;
  previewImage?: string | null;
  metadataStatus?: "pending" | "ready" | "failed";
  metadataFetchedAt?: Date | null;
  reachabilityStatus?: "unknown" | "reachable" | "unreachable";
  reachabilityCheckedAt?: Date | null;
  tagIds?: Array<BookmarkTagRecord | null>;
  isArchive?: boolean;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export function mapBookmark(bookmark: BookmarkRecord) {
  return {
    id: bookmark._id.toString(),
    url: bookmark.url,
    title: bookmark.title ?? null,
    description: bookmark.description ?? null,
    iconUrl: bookmark.iconUrl ?? null,
    siteName: bookmark.siteName ?? null,
    previewImage: bookmark.previewImage ?? null,
    metadataStatus: bookmark.metadataStatus ?? "pending",
    metadataFetchedAt: bookmark.metadataFetchedAt ?? null,
    reachabilityStatus: bookmark.reachabilityStatus ?? "unknown",
    reachabilityCheckedAt: bookmark.reachabilityCheckedAt ?? null,
    tags:
      bookmark.tagIds
        ?.filter((tag): tag is BookmarkTagRecord => Boolean(tag))
        .map((tag) => ({
          id: tag._id.toString(),
          name: tag.name,
          color: tag.color,
        })) ?? [],
    isArchive: bookmark.isArchive ?? false,
    order: bookmark.order ?? 0,
    createdAt: bookmark.createdAt ?? null,
    updatedAt: bookmark.updatedAt ?? null,
  };
}
