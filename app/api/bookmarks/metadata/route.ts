import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { fetchBookmarkMetadata } from "@/lib/bookmarkMetadata";
import { mapBookmark, type BookmarkRecord } from "@/lib/bookmarks";
import { connectToDatabase } from "@/lib/db";
import { Bookmark } from "@/models/Bookmark";

export const runtime = "nodejs";

const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 20;
const CONCURRENCY = 5;
const METADATA_TTL_MS = 24 * 60 * 60 * 1000;

type RefreshMetadataBody = {
  bookmarkIds?: string[];
  limit?: number;
  force?: boolean;
};

async function runWithConcurrency<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
) {
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await worker(item);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, runWorker),
  );
}

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json()) as RefreshMetadataBody;
    const requestedIds = Array.isArray(body.bookmarkIds)
      ? [...new Set(body.bookmarkIds.map((id) => id.trim()).filter(Boolean))]
      : [];
    const requestedLimit = Number.isInteger(body.limit) ? body.limit! : DEFAULT_BATCH_SIZE;
    const limit = Math.max(1, Math.min(requestedLimit, MAX_BATCH_SIZE));

    if (requestedIds.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: `A maximum of ${MAX_BATCH_SIZE} bookmarks can be refreshed at once.`,
        },
        { status: 400 },
      );
    }

    if (requestedIds.some((id) => !Types.ObjectId.isValid(id))) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more bookmark IDs are invalid.",
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const filter: Record<string, unknown> = {
      userId: auth.payload.sub,
      isArchive: false,
    };

    if (requestedIds.length > 0) {
      filter._id = { $in: requestedIds };
    }

    if (!body.force) {
      const staleBefore = new Date(Date.now() - METADATA_TTL_MS);
      filter.$or = [
        { metadataStatus: { $exists: false } },
        { metadataStatus: "pending" },
        { reachabilityStatus: { $exists: false } },
        { reachabilityStatus: "unknown" },
        { metadataFetchedAt: { $lt: staleBefore } },
        { reachabilityCheckedAt: { $lt: staleBefore } },
      ];
    }

    const bookmarks = await Bookmark.find(filter)
      .sort({ metadataFetchedAt: 1, createdAt: 1 })
      .limit(requestedIds.length > 0 ? requestedIds.length : limit)
      .lean();

    await runWithConcurrency(bookmarks, async (bookmark) => {
      const metadata = await fetchBookmarkMetadata(bookmark.url);
      const checkedAt = new Date();
      const updates: Record<string, unknown> = {
        metadataStatus: metadata.metadataStatus,
        metadataFetchedAt: checkedAt,
        reachabilityStatus: metadata.reachabilityStatus,
        reachabilityCheckedAt: checkedAt,
      };

      if (metadata.metadataStatus === "ready") {
        updates.siteName = metadata.siteName;
        updates.previewImage = metadata.previewImage;

        if (!bookmark.title && metadata.title) updates.title = metadata.title;
        if (!bookmark.description && metadata.description) {
          updates.description = metadata.description;
        }
        if (!bookmark.iconUrl && metadata.iconUrl) updates.iconUrl = metadata.iconUrl;
      }

      await Bookmark.updateOne(
        { _id: bookmark._id, userId: auth.payload.sub },
        { $set: updates },
      );
    });

    const refreshedBookmarks = await Bookmark.find({
      _id: { $in: bookmarks.map((bookmark) => bookmark._id) },
      userId: auth.payload.sub,
    })
      .populate("tagIds", "name color")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Bookmark metadata refreshed successfully.",
      processedCount: refreshedBookmarks.length,
      data: refreshedBookmarks.map((bookmark) =>
        mapBookmark(bookmark as BookmarkRecord),
      ),
    });
  } catch (error) {
    console.error("Refresh bookmark metadata API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while refreshing bookmark metadata.",
      },
      { status: 500 },
    );
  }
}
