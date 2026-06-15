import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Bookmark } from "@/models/Bookmark";

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
    createdAt: bookmark.createdAt ?? null,
    updatedAt: bookmark.updatedAt ?? null,
  };
}

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

    const regex = new RegExp(escapeRegExp(q), "i");
    const filter: Record<string, unknown> = {
      userId: auth.payload.sub,
      $or: [
        { url: regex },
        { title: regex },
        { description: regex },
      ],
    };

    if (isArchiveParam === "true") {
      filter.isArchive = true;
    } else if (isArchiveParam === "false") {
      filter.isArchive = false;
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

    const [bookmarks, total] = await Promise.all([
      Bookmark.find(filter)
        .populate("tagIds", "name color")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Bookmark.countDocuments(filter),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      message: "Bookmarks search completed successfully.",
      data: bookmarks.map(mapBookmark),
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
