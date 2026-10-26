import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getNextBookmarkOrder } from "@/lib/bookmarkOrder";
import { fetchBookmarkMetadata } from "@/lib/bookmarkMetadata";
import {
  mapBookmark,
  normalizeBookmarkUrl,
  type BookmarkRecord,
} from "@/lib/bookmarks";
import { connectToDatabase } from "@/lib/db";
import { Bookmark } from "@/models/Bookmark";
import { Tag } from "@/models/Tag";

type UpdateBookmarkBody = {
  url?: string;
  title?: string | null;
  description?: string | null;
  iconUrl?: string | null;
  tagIds?: string[];
  isArchive?: boolean;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/bookmarks/[id]">,
) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid bookmark ID.",
        },
        { status: 400 },
      );
    }

    const body = (await request.json()) as UpdateBookmarkBody;
    const updates: Record<string, unknown> = {};

    if (body.url !== undefined) {
      const url = body.url.trim();

      if (!url) {
        return NextResponse.json(
          {
            success: false,
            message: "url cannot be empty.",
          },
          { status: 400 },
        );
      }

      try {
        updates.url = url;
        updates.normalizedUrl = normalizeBookmarkUrl(url);
      } catch {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid URL format.",
          },
          { status: 400 },
        );
      }
    }

    if (body.title !== undefined) {
      updates.title = body.title?.trim() || null;
    }

    if (body.description !== undefined) {
      updates.description = body.description?.trim() || null;
    }

    if (body.iconUrl !== undefined) {
      updates.iconUrl = body.iconUrl?.trim() || null;
    }

    if (body.tagIds !== undefined) {
      const tagIds = Array.isArray(body.tagIds)
        ? [...new Set(body.tagIds.map((tagId) => tagId.trim()).filter(Boolean))]
        : [];

      if (!tagIds.every((tagId) => Types.ObjectId.isValid(tagId))) {
        return NextResponse.json(
          {
            success: false,
            message: "One or more tag IDs are invalid.",
          },
          { status: 400 },
        );
      }

      updates.tagIds = tagIds;
    }

    if (body.isArchive !== undefined) {
      updates.isArchive = body.isArchive;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid fields provided for update.",
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    if (updates.tagIds) {
      const tags = await Tag.find({
        _id: { $in: updates.tagIds as string[] },
        userId: auth.payload.sub,
      })
        .select("_id")
        .lean();

      if (tags.length !== (updates.tagIds as string[]).length) {
        return NextResponse.json(
          {
            success: false,
            message: "One or more tags were not found.",
          },
          { status: 404 },
        );
      }
    }

    const currentBookmark = await Bookmark.findOne({
      _id: id,
      userId: auth.payload.sub,
    }).lean();

    if (!currentBookmark) {
      return NextResponse.json(
        {
          success: false,
          message: "Bookmark not found.",
        },
        { status: 404 },
      );
    }

    if (updates.normalizedUrl) {
      const duplicate = await Bookmark.findOne({
        _id: { $ne: id },
        userId: auth.payload.sub,
        normalizedUrl: updates.normalizedUrl,
      }).lean();

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message: "This URL already exists in your bookmarks.",
          },
          { status: 409 },
        );
      }

      if (updates.normalizedUrl !== currentBookmark.normalizedUrl) {
        const metadata = await fetchBookmarkMetadata(updates.url as string);
        const checkedAt = new Date();

        if (body.title === undefined) updates.title = metadata.title;
        if (body.description === undefined) {
          updates.description = metadata.description;
        }

        updates.iconUrl = updates.iconUrl ?? metadata.iconUrl ?? null;
        updates.siteName = metadata.siteName;
        updates.previewImage = metadata.previewImage;
        updates.metadataStatus = metadata.metadataStatus;
        updates.metadataFetchedAt = checkedAt;
        updates.reachabilityStatus = metadata.reachabilityStatus;
        updates.reachabilityCheckedAt = checkedAt;
      }
    }

    if (
      updates.isArchive !== undefined &&
      updates.isArchive !== (currentBookmark.isArchive ?? false)
    ) {
      updates.order = await getNextBookmarkOrder(
        auth.payload.sub,
        updates.isArchive as boolean,
      );
    }

    const updatedBookmark = await Bookmark.findOneAndUpdate(
      { _id: id, userId: auth.payload.sub },
      { $set: updates },
      { new: true },
    )
      .populate("tagIds", "name color")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Bookmark updated successfully.",
      data: mapBookmark(updatedBookmark as BookmarkRecord),
    });
  } catch (error) {
    console.error("Update bookmark API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while updating bookmark.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/bookmarks/[id]">,
) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid bookmark ID.",
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const deletedBookmark = await Bookmark.findOneAndDelete({
      _id: id,
      userId: auth.payload.sub,
    }).lean();

    if (!deletedBookmark) {
      return NextResponse.json(
        {
          success: false,
          message: "Bookmark not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Bookmark deleted successfully.",
    });
  } catch (error) {
    console.error("Delete bookmark API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while deleting bookmark.",
      },
      { status: 500 },
    );
  }
}
