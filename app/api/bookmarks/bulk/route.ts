import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { authenticateRequest } from "@/lib/auth";
import { BOOKMARK_ORDER_GAP, getNextBookmarkOrder } from "@/lib/bookmarkOrder";
import { normalizeBookmarkUrl } from "@/lib/bookmarks";
import { connectToDatabase } from "@/lib/db";
import { defaultTags, normalizeTagName } from "@/lib/tags";
import { Bookmark } from "@/models/Bookmark";
import { Tag } from "@/models/Tag";

type BulkBookmarkItem = {
  url?: string;
  title?: string;
  description?: string;
  iconUrl?: string;
  tagIds?: string[];
  tagNames?: string[];
  isArchive?: boolean;
  createdDate?: string;
};

type BulkCreateBookmarksBody = {
  bookmarks?: BulkBookmarkItem[];
};

function parseCreatedDate(value: string | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return { value: null as Date | null, error: null as string | null };
  }

  const parsedDate = new Date(trimmedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return { value: null as Date | null, error: "createdDate must be a valid date." };
  }

  return { value: parsedDate, error: null as string | null };
}

const defaultTagColorByName = new Map(
  defaultTags.map((tag) => [normalizeTagName(tag.name), tag.color]),
);

function getRestoredTagColor(normalizedName: string) {
  return defaultTagColorByName.get(normalizedName) ?? "#6B7280";
}

function mapBookmark(bookmark: {
  _id: { toString(): string };
  url: string;
  title?: string | null;
  description?: string | null;
  iconUrl?: string | null;
  tagIds?: Array<{
    _id: { toString(): string };
    name: string;
    color: string;
  }>;
  isArchive?: boolean;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: bookmark._id.toString(),
    url: bookmark.url,
    title: bookmark.title ?? null,
    description: bookmark.description ?? null,
    iconUrl: bookmark.iconUrl ?? null,
    tags:
      bookmark.tagIds?.map((tag) => ({
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

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json()) as BulkCreateBookmarksBody;
    const bookmarks = Array.isArray(body.bookmarks) ? body.bookmarks : [];

    if (bookmarks.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "bookmarks array is required.",
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const allTagIds = [
      ...new Set(
        bookmarks.flatMap((bookmark) =>
          Array.isArray(bookmark.tagIds)
            ? bookmark.tagIds.map((tagId) => tagId.trim()).filter(Boolean)
            : [],
        ),
      ),
    ];
    const allTagNames = [
      ...new Set(
        bookmarks.flatMap((bookmark) =>
          Array.isArray(bookmark.tagNames)
            ? bookmark.tagNames.map((tagName) => tagName.trim()).filter(Boolean)
            : [],
        ),
      ),
    ];

    const validTagIds = allTagIds.filter((tagId) => Types.ObjectId.isValid(tagId));
    const allowedTagIds = new Set<string>();
    const allowedTagIdsByName = new Map<string, string>();

    if (validTagIds.length > 0) {
      const tags = await Tag.find({
        _id: { $in: validTagIds },
        userId: auth.payload.sub,
      })
        .select("_id")
        .lean();

      for (const tag of tags) {
        allowedTagIds.add(tag._id.toString());
      }
    }

    const normalizedTagNames = [...new Set(allTagNames.map((tagName) => normalizeTagName(tagName)))];

    if (normalizedTagNames.length > 0) {
      const existingTags = await Tag.find({
        userId: auth.payload.sub,
        normalizedName: { $in: normalizedTagNames },
      })
        .select("_id normalizedName")
        .lean();

      for (const tag of existingTags) {
        allowedTagIdsByName.set(tag.normalizedName, tag._id.toString());
      }

      const missingTagNames = normalizedTagNames.filter(
        (normalizedName) => !allowedTagIdsByName.has(normalizedName),
      );

      if (missingTagNames.length > 0) {
        const createdTags = await Tag.insertMany(
          missingTagNames.map((normalizedName) => ({
            userId: auth.payload.sub,
            name: allTagNames.find((tagName) => normalizeTagName(tagName) === normalizedName) ?? normalizedName,
            normalizedName,
            color: getRestoredTagColor(normalizedName),
            isSystemDefault: false,
          })),
          { ordered: false },
        );

        for (const tag of createdTags) {
          allowedTagIdsByName.set(tag.normalizedName, tag._id.toString());
        }
      }
    }

    const prepared: Array<{
      url: string;
      normalizedUrl: string;
      title: string | null;
      description: string | null;
      iconUrl: string | null;
      tagIds: string[];
      isArchive: boolean;
      createdAt: Date | null;
    }> = [];
    const skipped: Array<{ url: string | null; reason: string }> = [];
    const payloadNormalizedUrls = new Set<string>();

    for (const item of bookmarks) {
      const url = item.url?.trim() || null;

      if (!url) {
        skipped.push({
          url: null,
          reason: "url is required.",
        });
        continue;
      }

      let normalizedUrl: string;

      try {
        normalizedUrl = normalizeBookmarkUrl(url);
      } catch {
        skipped.push({
          url,
          reason: "Invalid URL format.",
        });
        continue;
      }

      if (payloadNormalizedUrls.has(normalizedUrl)) {
        skipped.push({
          url,
          reason: "Duplicate URL found in import payload.",
        });
        continue;
      }

      const parsedCreatedDate = parseCreatedDate(item.createdDate);

      if (parsedCreatedDate.error) {
        skipped.push({
          url,
          reason: parsedCreatedDate.error,
        });
        continue;
      }

      payloadNormalizedUrls.add(normalizedUrl);

      prepared.push({
        url,
        normalizedUrl,
        title: item.title?.trim() || null,
        description: item.description?.trim() || null,
        iconUrl: item.iconUrl?.trim() || null,
        tagIds: [
          ...(Array.isArray(item.tagIds)
            ? [
                ...new Set(
                  item.tagIds
                    .map((tagId) => tagId.trim())
                    .filter((tagId) => Boolean(tagId) && allowedTagIds.has(tagId)),
                ),
              ]
            : []),
          ...(Array.isArray(item.tagNames)
            ? [
                ...new Set(
                  item.tagNames
                    .map((tagName) => normalizeTagName(tagName))
                    .map((tagName) => allowedTagIdsByName.get(tagName))
                    .filter((tagId): tagId is string => Boolean(tagId)),
                ),
              ]
            : []),
        ].filter((tagId, index, tagIds) => tagIds.indexOf(tagId) === index),
        isArchive: item.isArchive ?? false,
        createdAt: parsedCreatedDate.value,
      });
    }

    if (prepared.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: "No bookmarks were imported.",
          createdCount: 0,
          skippedCount: skipped.length,
          skipped,
          data: [],
        },
        { status: 200 },
      );
    }

    const existingBookmarks = await Bookmark.find({
      userId: auth.payload.sub,
      normalizedUrl: { $in: prepared.map((item) => item.normalizedUrl) },
    })
      .select("normalizedUrl url")
      .lean();

    const existingNormalizedUrls = new Set(
      existingBookmarks.map((bookmark) => bookmark.normalizedUrl),
    );

    const toInsert = prepared.filter((item) => {
      if (existingNormalizedUrls.has(item.normalizedUrl)) {
        skipped.push({
          url: item.url,
          reason: "This URL already exists in your bookmarks.",
        });
        return false;
      }

      return true;
    });

    if (toInsert.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: "No new bookmarks were imported.",
          createdCount: 0,
          skippedCount: skipped.length,
          skipped,
          data: [],
        },
        { status: 200 },
      );
    }

    const nextActiveOrder = await getNextBookmarkOrder(auth.payload.sub, false);
    const nextArchiveOrder = await getNextBookmarkOrder(auth.payload.sub, true);
    let activeOrder = nextActiveOrder;
    let archiveOrder = nextArchiveOrder;

    const insertedBookmarks = await Bookmark.insertMany(
      toInsert.map((item) => {
        const order = item.isArchive ? archiveOrder : activeOrder;

        if (item.isArchive) {
          archiveOrder += BOOKMARK_ORDER_GAP;
        } else {
          activeOrder += BOOKMARK_ORDER_GAP;
        }

        return {
          order,
          userId: auth.payload.sub,
          url: item.url,
          normalizedUrl: item.normalizedUrl,
          title: item.title,
          description: item.description,
          iconUrl: item.iconUrl,
          tagIds: item.tagIds,
          isArchive: item.isArchive,
          ...(item.createdAt ? { createdAt: item.createdAt } : {}),
        };
      }),
      { ordered: false },
    );

    const insertedIds = insertedBookmarks.map((bookmark) => bookmark._id);
    const createdBookmarks = await Bookmark.find({ _id: { $in: insertedIds } })
      .populate("tagIds", "name color")
      .sort({ order: -1, createdAt: -1, _id: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      message: "Bookmarks imported successfully.",
      createdCount: createdBookmarks.length,
      skippedCount: skipped.length,
      skipped,
      data: createdBookmarks.map(mapBookmark),
    });
  } catch (error) {
    console.error("Bulk create bookmarks API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while importing bookmarks.",
      },
      { status: 500 },
    );
  }
}
