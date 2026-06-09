import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Bookmark } from "@/models/Bookmark";

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

    const result = await Bookmark.updateMany(filter, {
      $set: { tagIds: [] },
    });

    return NextResponse.json({
      success: true,
      message: "Tags removed from bookmarks successfully.",
      updatedCount: result.modifiedCount ?? 0,
    });
  } catch (error) {
    console.error("Remove bookmark tags API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while removing tags from bookmarks.",
      },
      { status: 500 },
    );
  }
}
