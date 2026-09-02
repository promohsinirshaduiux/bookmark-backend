import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { authenticateRequest } from "@/lib/auth";
import { ensureBookmarkOrders, getNextBookmarkOrder } from "@/lib/bookmarkOrder";
import { normalizeBookmarkUrl } from "@/lib/bookmarks";
import { connectToDatabase } from "@/lib/db";
import { Bookmark } from "@/models/Bookmark";
import { Tag } from "@/models/Tag";

type CreateBookmarkBody = {
  url?: string;
  title?: string;
  description?: string;
  iconUrl?: string;
  tagIds?: string[];
  isArchive?: boolean;
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
  } | null>;
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
      bookmark.tagIds
        ?.filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
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
    const filter: Record<string, unknown> = { userId: auth.payload.sub };

    if (isArchiveParam === "true") {
      filter.isArchive = true;
    } else if (isArchiveParam === "false") {
      filter.isArchive = false;
    }

    if (tagIdParam && Types.ObjectId.isValid(tagIdParam)) {
      filter.tagIds = tagIdParam;
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

    const bookmarks = await Bookmark.find(filter)
      .populate("tagIds", "name color")
      .sort({ isArchive: 1, order: -1, createdAt: -1, _id: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      message: "Bookmarks fetched successfully.",
      data: bookmarks.map(mapBookmark),
    });
  } catch (error) {
    console.error("Get bookmarks API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while fetching bookmarks.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json()) as CreateBookmarkBody;
    const url = body.url?.trim();
    const title = body.title?.trim() || null;
    const description = body.description?.trim() || null;
    const iconUrl = body.iconUrl?.trim() || null;
    const tagIds = Array.isArray(body.tagIds)
      ? [...new Set(body.tagIds.map((tagId) => tagId.trim()).filter(Boolean))]
      : [];
    const isArchive = body.isArchive ?? false;

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          message: "url is required.",
        },
        { status: 400 },
      );
    }

    let normalizedUrl: string;

    try {
      normalizedUrl = normalizeBookmarkUrl(url);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid URL format.",
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    if (!tagIds.every((tagId) => Types.ObjectId.isValid(tagId))) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more tag IDs are invalid.",
        },
        { status: 400 },
      );
    }

    if (tagIds.length > 0) {
      const tags = await Tag.find({
        _id: { $in: tagIds },
        userId: auth.payload.sub,
      })
        .select("_id")
        .lean();

      if (tags.length !== tagIds.length) {
        return NextResponse.json(
          {
            success: false,
            message: "One or more tags were not found.",
          },
          { status: 404 },
        );
      }
    }

    const existingBookmark = await Bookmark.findOne({
      userId: auth.payload.sub,
      normalizedUrl,
    }).lean();

    if (existingBookmark) {
      return NextResponse.json(
        {
          success: false,
          message: "This URL already exists in your bookmarks.",
        },
        { status: 409 },
      );
    }

    const bookmark = await Bookmark.create({
      userId: auth.payload.sub,
      url,
      normalizedUrl,
      title,
      description,
      iconUrl,
      tagIds,
      isArchive,
      order: await getNextBookmarkOrder(auth.payload.sub, isArchive),
    });

    const populatedBookmark = await Bookmark.findById(bookmark._id)
      .populate("tagIds", "name color")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Bookmark added successfully.",
        data: mapBookmark(populatedBookmark!),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create bookmark API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while creating bookmark.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const isArchiveParam = searchParams.get("isArchive");
    const filter: Record<string, unknown> = { userId: auth.payload.sub };

    if (isArchiveParam === "true") {
      filter.isArchive = true;
    } else if (isArchiveParam === "false") {
      filter.isArchive = false;
    }

    const result = await Bookmark.deleteMany(filter);

    return NextResponse.json({
      success: true,
      message: "Bookmarks deleted successfully.",
      deletedCount: result.deletedCount ?? 0,
    });
  } catch (error) {
    console.error("Delete all bookmarks API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while deleting bookmarks.",
      },
      { status: 500 },
    );
  }
}
