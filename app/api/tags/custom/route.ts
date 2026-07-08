import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Bookmark } from "@/models/Bookmark";
import { Tag } from "@/models/Tag";

export async function DELETE(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    await connectToDatabase();

    const customTags = await Tag.find({
      userId: auth.payload.sub,
      isSystemDefault: false,
    })
      .select("_id")
      .lean();

    const customTagIds = customTags.map((tag) => new Types.ObjectId(tag._id.toString()));

    if (customTagIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No custom tags found for this user.",
        deletedCount: 0,
        updatedBookmarkCount: 0,
      });
    }

    const deleteResult = await Tag.deleteMany({
      _id: { $in: customTagIds },
      userId: auth.payload.sub,
    });

    const bookmarkResult = await Bookmark.updateMany(
      { userId: auth.payload.sub, tagIds: { $in: customTagIds } },
      { $pull: { tagIds: { $in: customTagIds } } },
    );

    return NextResponse.json({
      success: true,
      message: "Custom tags deleted successfully.",
      deletedCount: deleteResult.deletedCount ?? 0,
      updatedBookmarkCount: bookmarkResult.modifiedCount ?? 0,
    });
  } catch (error) {
    console.error("Delete custom tags API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while deleting custom tags.",
      },
      { status: 500 },
    );
  }
}
