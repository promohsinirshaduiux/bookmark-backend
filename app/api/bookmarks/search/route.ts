import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { authenticateRequest } from "@/lib/auth";
import { ensureBookmarkOrders } from "@/lib/bookmarkOrder";
import { mapBookmark, type BookmarkRecord } from "@/lib/bookmarks";
import { connectToDatabase } from "@/lib/db";
import { Bookmark } from "@/models/Bookmark";
import { Tag } from "@/models/Tag";

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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim();
    const isArchiveParam = searchParams.get("isArchive");
    const tagIdParam = searchParams.get("tagId");
    const reachabilityStatus = searchParams.get("reachabilityStatus");
    const page = parsePositiveInteger(searchParams.get("page"), 1);
    const requestedLimit = parsePositiveInteger(searchParams.get("limit"), 20);
    const limit = Math.min(requestedLimit, 100);
    const skip = (page - 1) * limit;

    if (!q) {
      return NextResponse.json(
        {
          success: false,
          message: "q is required.",
        },
        { status: 400 },
      );
    }

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

    const regex = new RegExp(escapeRegExp(q), "i");
    const matchingTags = await Tag.find({
      userId: auth.payload.sub,
      name: regex,
    })
      .select("_id")
      .lean();

    const filter: Record<string, unknown> = {
      userId: auth.payload.sub,
      $or: [
        { url: regex },
        { title: regex },
        { description: regex },
        ...(matchingTags.length > 0
          ? [{ tagIds: { $in: matchingTags.map((tag) => tag._id) } }]
          : []),
      ],
    };

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
      message: "Bookmarks search completed successfully.",
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
    console.error("Search bookmarks API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while searching bookmarks.",
      },
      { status: 500 },
    );
  }
}
