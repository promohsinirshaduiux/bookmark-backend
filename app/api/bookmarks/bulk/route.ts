import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { authenticateRequest } from "@/lib/auth";
import { normalizeBookmarkUrl } from "@/lib/bookmarks";
import { connectToDatabase } from "@/lib/db";
import { Bookmark } from "@/models/Bookmark";
import { Tag } from "@/models/Tag";

type BulkBookmarkItem = {
  url?: string;
  title?: string;
  description?: string;
  iconUrl?: string;
  tagIds?: string[];
  isArchive?: boolean;
};

type BulkCreateBookmarksBody = {
  bookmarks?: BulkBookmarkItem[];
};

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

    if (!allTagIds.every((tagId) => Types.ObjectId.isValid(tagId))) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more tag IDs are invalid.",
        },
        { status: 400 },
      );
    }

    if (allTagIds.length > 0) {
      const tags = await Tag.find({
        _id: { $in: allTagIds },
        userId: auth.payload.sub,
      })
        .select("_id")
        .lean();

      if (tags.length !== allTagIds.length) {
        return NextResponse.json(
          {
            success: false,
            message: "One or more tags were not found.",
          },
          { status: 404 },
        );
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

      payloadNormalizedUrls.add(normalizedUrl);

      prepared.push({
        url,
        normalizedUrl,
        title: item.title?.trim() || null,
        description: item.description?.trim() || null,
        iconUrl: item.iconUrl?.trim() || null,
        tagIds: Array.isArray(item.tagIds)
          ? [...new Set(item.tagIds.map((tagId) => tagId.trim()).filter(Boolean))]
          : [],
        isArchive: item.isArchive ?? false,
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

    const insertedBookmarks = await Bookmark.insertMany(
      toInsert.map((item) => ({
        userId: auth.payload.sub,
        url: item.url,
        normalizedUrl: item.normalizedUrl,
        title: item.title,
        description: item.description,
        iconUrl: item.iconUrl,
        tagIds: item.tagIds,
        isArchive: item.isArchive,
      })),
      { ordered: false },
    );

    const insertedIds = insertedBookmarks.map((bookmark) => bookmark._id);
    const createdBookmarks = await Bookmark.find({ _id: { $in: insertedIds } })
      .populate("tagIds", "name color")
      .sort({ createdAt: -1 })
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
