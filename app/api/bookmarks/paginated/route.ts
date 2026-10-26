import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { authenticateRequest } from "@/lib/auth";
import { ensureBookmarkOrders } from "@/lib/bookmarkOrder";
import { mapBookmark, type BookmarkRecord } from "@/lib/bookmarks";
import { connectToDatabase } from "@/lib/db";
import { Bookmark } from "@/models/Bookmark";

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const isArchiveParam = searchParams.get("isArchive");
    const tagIdParam = searchParams.get("tagId");
    const notTaggedParam = searchParams.get("notTagged");
    const reachabilityStatus = searchParams.get("reachabilityStatus");
    const page = parsePositiveInteger(searchParams.get("page"), 1);
    const requestedLimit = parsePositiveInteger(searchParams.get("limit"), 20);
    const limit = Math.min(requestedLimit, 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { userId: auth.payload.sub };

    if (
      reachabilityStatus &&
      !["unknown", "reachable", "unreachable"].includes(reachabilityStatus)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid reachabilityStatus.",
        },
        { status: 400 },
      );
    }

    if (isArchiveParam === "true") {
      filter.isArchive = true;
    } else if (isArchiveParam === "false") {
      filter.isArchive = false;
    }

    if (reachabilityStatus) {
      filter.reachabilityStatus = reachabilityStatus;
    }

    if (tagIdParam) {
      if (!Types.ObjectId.isValid(tagIdParam)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid tagId.",
          },
          { status: 400 },
        );
      }

      filter.tagIds = new Types.ObjectId(tagIdParam);
    } else if (notTaggedParam === "true") {
      filter.$or = [
        { tagIds: { $exists: false } },
        { tagIds: { $size: 0 } },
      ];
    }

    if (isArchiveParam === "true") {
      await ensureBookmarkOrders(auth.payload.sub, true);
    } else if (isArchiveParam === "false") {
      await ensureBookmarkOrders(auth.payload.sub, false);
    } else {
      await Promise.all([
        ensureBookmarkOrders(auth.payload.sub, false),
        ensureBookmarkOrders(auth.payload.sub, true),
      ]);
    }

    const [bookmarks, total] = await Promise.all([
      Bookmark.find(filter)
        .populate("tagIds", "name color")
        .sort({ isArchive: 1, order: -1, createdAt: -1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Bookmark.countDocuments(filter),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      message: "Bookmarks fetched successfully.",
      data: bookmarks.map((bookmark) => mapBookmark(bookmark as BookmarkRecord)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get paginated bookmarks API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while fetching paginated bookmarks.",
      },
      { status: 500 },
    );
  }
}
