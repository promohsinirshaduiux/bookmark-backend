import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Bookmark } from "@/models/Bookmark";
import { Tag } from "@/models/Tag";

type MoveBookmarksBody = {
  targetTagId?: string;
};

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/tags/[id]/move-bookmarks">,
) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    const { id } = await context.params;
    const body = (await request.json()) as MoveBookmarksBody;
    const targetTagId = body.targetTagId?.trim();

    if (!Types.ObjectId.isValid(id) || !targetTagId || !Types.ObjectId.isValid(targetTagId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid source and target tag IDs are required.",
        },
        { status: 400 },
      );
    }

    if (id === targetTagId) {
      return NextResponse.json(
        {
          success: false,
          message: "Source and target tags cannot be the same.",
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const tags = await Tag.find({
      _id: { $in: [id, targetTagId] },
      userId: auth.payload.sub,
    })
      .select("_id")
      .lean();

    if (tags.length !== 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Source or target tag not found.",
        },
        { status: 404 },
      );
    }

    const sourceObjectId = new Types.ObjectId(id);
    const targetObjectId = new Types.ObjectId(targetTagId);

    await Bookmark.updateMany(
      { userId: auth.payload.sub, tagIds: sourceObjectId },
      { $addToSet: { tagIds: targetObjectId } },
    );

    const result = await Bookmark.updateMany(
      { userId: auth.payload.sub, tagIds: sourceObjectId },
      { $pull: { tagIds: sourceObjectId } },
    );

    return NextResponse.json({
      success: true,
      message: "Bookmarks moved to the target tag successfully.",
      updatedCount: result.modifiedCount ?? 0,
    });
  } catch (error) {
    console.error("Move tag bookmarks API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while moving bookmarks to another tag.",
      },
      { status: 500 },
    );
  }
}
