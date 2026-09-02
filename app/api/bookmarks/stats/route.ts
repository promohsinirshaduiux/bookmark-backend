import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Bookmark } from "@/models/Bookmark";

function getCount(
  bucket:
    | Array<{
        count?: number;
      }>
    | undefined,
) {
  return bucket?.[0]?.count ?? 0;
}

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    await connectToDatabase();

    const userId = Types.ObjectId.isValid(auth.payload.sub)
      ? new Types.ObjectId(auth.payload.sub)
      : auth.payload.sub;

    const [stats] = await Bookmark.aggregate<{
      active: Array<{ count: number }>;
      archived: Array<{ count: number }>;
      untagged: Array<{ count: number }>;
      unreachable: Array<{ count: number }>;
    }>([
      {
        $match: {
          userId,
        },
      },
      {
        $facet: {
          active: [{ $match: { isArchive: false } }, { $count: "count" }],
          archived: [{ $match: { isArchive: true } }, { $count: "count" }],
          untagged: [
            {
              $match: {
                isArchive: false,
                $or: [{ tagIds: { $exists: false } }, { tagIds: { $size: 0 } }],
              },
            },
            { $count: "count" },
          ],
          unreachable: [
            {
              $match: {
                isArchive: false,
                reachabilityStatus: "unreachable",
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        activeCount: getCount(stats?.active),
        archivedCount: getCount(stats?.archived),
        untaggedCount: getCount(stats?.untagged),
        unreachableCount: getCount(stats?.unreachable),
      },
    });
  } catch (error) {
    console.error("Get bookmark stats API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while fetching bookmark stats.",
      },
      { status: 500 },
    );
  }
}
