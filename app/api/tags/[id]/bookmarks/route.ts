import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Bookmark } from "@/models/Bookmark";
import { Tag } from "@/models/Tag";

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/tags/[id]/bookmarks">,
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
          message: "Invalid tag ID.",
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const tag = await Tag.findOne({
      _id: id,
      userId: auth.payload.sub,
    })
      .select("_id")
      .lean();

    if (!tag) {
      return NextResponse.json(
        {
          success: false,
          message: "Tag not found.",
        },
        { status: 404 },
      );
    }

    const result = await Bookmark.deleteMany({
      userId: auth.payload.sub,
      tagIds: new Types.ObjectId(id),
    });

    return NextResponse.json({
      success: true,
      message: "Bookmarks under this tag deleted successfully.",
      deletedCount: result.deletedCount ?? 0,
    });
  } catch (error) {
    console.error("Delete tag bookmarks API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while deleting bookmarks under this tag.",
      },
      { status: 500 },
    );
  }
}
