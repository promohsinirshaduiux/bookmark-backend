import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import {
  BOOKMARK_ORDER_GAP,
  ensureBookmarkOrders,
} from "@/lib/bookmarkOrder";
import { connectToDatabase } from "@/lib/db";
import { Bookmark } from "@/models/Bookmark";

type ReorderBookmarksBody = {
  movedBookmarkId?: string;
  prevBookmarkId?: string | null;
  nextBookmarkId?: string | null;
};

function isValidObjectId(value: string | null | undefined) {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json()) as ReorderBookmarksBody;
    const movedBookmarkId = body.movedBookmarkId?.trim();
    const prevBookmarkId = body.prevBookmarkId?.trim() ?? null;
    const nextBookmarkId = body.nextBookmarkId?.trim() ?? null;

    if (!movedBookmarkId || !isValidObjectId(movedBookmarkId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid movedBookmarkId is required.",
        },
        { status: 400 },
      );
    }

    if (prevBookmarkId && !isValidObjectId(prevBookmarkId)) {
      return NextResponse.json(
        {
          success: false,
          message: "prevBookmarkId must be a valid bookmark ID or null.",
        },
        { status: 400 },
      );
    }

    if (nextBookmarkId && !isValidObjectId(nextBookmarkId)) {
      return NextResponse.json(
        {
          success: false,
          message: "nextBookmarkId must be a valid bookmark ID or null.",
        },
        { status: 400 },
      );
    }

    if (!prevBookmarkId && !nextBookmarkId) {
      return NextResponse.json(
        {
          success: false,
          message: "Either prevBookmarkId or nextBookmarkId is required.",
        },
        { status: 400 },
      );
    }

    if (
      prevBookmarkId === movedBookmarkId ||
      nextBookmarkId === movedBookmarkId ||
      (prevBookmarkId && nextBookmarkId && prevBookmarkId === nextBookmarkId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Bookmark IDs in the reorder request are invalid.",
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const bookmarks = await Bookmark.find({
      userId: auth.payload.sub,
      _id: {
        $in: [movedBookmarkId, prevBookmarkId, nextBookmarkId].filter(Boolean),
      },
    })
      .select("_id isArchive order createdAt")
      .lean();

    const movedBookmark = bookmarks.find((bookmark) => bookmark._id.toString() === movedBookmarkId);
    const prevBookmark = prevBookmarkId
      ? bookmarks.find((bookmark) => bookmark._id.toString() === prevBookmarkId)
      : null;
    const nextBookmark = nextBookmarkId
      ? bookmarks.find((bookmark) => bookmark._id.toString() === nextBookmarkId)
      : null;

    if (!movedBookmark) {
      return NextResponse.json(
        {
          success: false,
          message: "Moved bookmark not found.",
        },
        { status: 404 },
      );
    }

    if (prevBookmarkId && !prevBookmark) {
      return NextResponse.json(
        {
          success: false,
          message: "Previous bookmark not found.",
        },
        { status: 404 },
      );
    }

    if (nextBookmarkId && !nextBookmark) {
      return NextResponse.json(
        {
          success: false,
          message: "Next bookmark not found.",
        },
        { status: 404 },
      );
    }

    const scopeIsArchive = movedBookmark.isArchive ?? false;

    if (
      (prevBookmark && (prevBookmark.isArchive ?? false) !== scopeIsArchive) ||
      (nextBookmark && (nextBookmark.isArchive ?? false) !== scopeIsArchive)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Bookmarks can only be reordered within the same archive state.",
        },
        { status: 400 },
      );
    }

    await ensureBookmarkOrders(auth.payload.sub, scopeIsArchive);

    const scopeBookmarks = await Bookmark.find({
      userId: auth.payload.sub,
      isArchive: scopeIsArchive,
    })
      .select("_id order createdAt")
      .sort({ order: 1, createdAt: -1, _id: 1 })
      .lean();

    const currentIds = scopeBookmarks.map((bookmark) => bookmark._id.toString());
    const movedIndex = currentIds.indexOf(movedBookmarkId);

    if (movedIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          message: "Moved bookmark not found in its reorder scope.",
        },
        { status: 404 },
      );
    }

    const remainingIds = currentIds.filter((id) => id !== movedBookmarkId);
    let targetIndex = 0;

    if (prevBookmarkId) {
      const prevIndex = remainingIds.indexOf(prevBookmarkId);

      if (prevIndex === -1) {
        return NextResponse.json(
          {
            success: false,
            message: "Previous bookmark not found in reorder scope.",
          },
          { status: 404 },
        );
      }

      targetIndex = prevIndex + 1;
    }

    if (nextBookmarkId) {
      const nextIndex = remainingIds.indexOf(nextBookmarkId);

      if (nextIndex === -1) {
        return NextResponse.json(
          {
            success: false,
            message: "Next bookmark not found in reorder scope.",
          },
          { status: 404 },
        );
      }

      if (prevBookmarkId && targetIndex !== nextIndex) {
        return NextResponse.json(
          {
            success: false,
            message: "prevBookmarkId and nextBookmarkId are not adjacent after the move.",
          },
          { status: 400 },
        );
      }

      if (!prevBookmarkId) {
        targetIndex = nextIndex;
      }
    } else {
      targetIndex = remainingIds.length;
    }

    const reorderedIds = [...remainingIds];
    reorderedIds.splice(targetIndex, 0, movedBookmarkId);

    if (reorderedIds.every((id, index) => id === currentIds[index])) {
      return NextResponse.json({
        success: true,
        message: "Bookmark order is already up to date.",
      });
    }

    const previousOrderValue = prevBookmarkId
      ? scopeBookmarks.find((bookmark) => bookmark._id.toString() === prevBookmarkId)?.order
      : null;
    const nextOrderValue = nextBookmarkId
      ? scopeBookmarks.find((bookmark) => bookmark._id.toString() === nextBookmarkId)?.order
      : null;

    if (typeof previousOrderValue === "number" && typeof nextOrderValue === "number") {
      if (nextOrderValue - previousOrderValue > 1) {
        const newOrder = Math.floor((previousOrderValue + nextOrderValue) / 2);

        await Bookmark.updateOne(
          { _id: movedBookmarkId, userId: auth.payload.sub },
          { $set: { order: newOrder } },
        );

        return NextResponse.json({
          success: true,
          message: "Bookmark reordered successfully.",
          data: {
            id: movedBookmarkId,
            order: newOrder,
            rebalanced: false,
          },
        });
      }
    } else if (typeof previousOrderValue === "number") {
      const newOrder = previousOrderValue + BOOKMARK_ORDER_GAP;

      await Bookmark.updateOne(
        { _id: movedBookmarkId, userId: auth.payload.sub },
        { $set: { order: newOrder } },
      );

      return NextResponse.json({
        success: true,
        message: "Bookmark reordered successfully.",
        data: {
          id: movedBookmarkId,
          order: newOrder,
          rebalanced: false,
        },
      });
    } else if (typeof nextOrderValue === "number" && nextOrderValue > 1) {
      const newOrder = Math.max(1, nextOrderValue - BOOKMARK_ORDER_GAP);

      if (newOrder < nextOrderValue) {
        await Bookmark.updateOne(
          { _id: movedBookmarkId, userId: auth.payload.sub },
          { $set: { order: newOrder } },
        );

        return NextResponse.json({
          success: true,
          message: "Bookmark reordered successfully.",
          data: {
            id: movedBookmarkId,
            order: newOrder,
            rebalanced: false,
          },
        });
      }
    }

    await Bookmark.bulkWrite(
      reorderedIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id, userId: auth.payload.sub },
          update: {
            $set: {
              order: (index + 1) * BOOKMARK_ORDER_GAP,
            },
          },
        },
      })),
    );

    return NextResponse.json({
      success: true,
      message: "Bookmark reordered successfully.",
      data: {
        id: movedBookmarkId,
        order: (targetIndex + 1) * BOOKMARK_ORDER_GAP,
        rebalanced: true,
      },
    });
  } catch (error) {
    console.error("Reorder bookmarks API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while reordering bookmarks.",
      },
      { status: 500 },
    );
  }
}
