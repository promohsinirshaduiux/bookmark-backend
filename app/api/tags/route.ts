import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { defaultTags, normalizeTagName } from "@/lib/tags";
import { Bookmark } from "@/models/Bookmark";
import { Tag } from "@/models/Tag";

type CreateTagBody = {
  name?: string;
  color?: string;
};

function mapTag(tag: {
  _id: { toString(): string };
  name: string;
  color: string;
  isSystemDefault?: boolean;
  bookmarkCount?: number;
}) {
  return {
    id: tag._id.toString(),
    name: tag.name,
    color: tag.color,
    isSystemDefault: tag.isSystemDefault ?? false,
    bookmarkCount: tag.bookmarkCount ?? 0,
  };
}

async function seedDefaultTags(userId: string) {
  const existingCount = await Tag.countDocuments({ userId });

  if (existingCount === 0) {
    await Tag.insertMany(
      defaultTags.map((tag) => ({
        userId,
        name: tag.name,
        normalizedName: normalizeTagName(tag.name),
        color: tag.color,
        isSystemDefault: true,
      })),
      { ordered: false },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    await connectToDatabase();
    await seedDefaultTags(auth.payload.sub);

    const tags = await Tag.find({ userId: auth.payload.sub }).sort({ name: 1 }).lean();
    const bookmarkCounts = await Bookmark.aggregate([
      { $match: { userId: tags[0]?.userId } },
      { $unwind: "$tagIds" },
      { $group: { _id: "$tagIds", count: { $sum: 1 } } },
    ]);

    const countsById = new Map(
      bookmarkCounts.map((item) => [item._id.toString(), item.count as number]),
    );

    return NextResponse.json({
      success: true,
      message: "Tags fetched successfully.",
      data: tags.map((tag) =>
        mapTag({
          ...tag,
          bookmarkCount: countsById.get(tag._id.toString()) ?? 0,
        }),
      ),
    });
  } catch (error) {
    console.error("Get tags API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while fetching tags.",
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

    const body = (await request.json()) as CreateTagBody;
    const name = body.name?.trim();
    const color = body.color?.trim();

    if (!name || !color) {
      return NextResponse.json(
        {
          success: false,
          message: "name and color are required.",
        },
        { status: 400 },
      );
    }

    const normalizedName = normalizeTagName(name);

    await connectToDatabase();

    const existingTag = await Tag.findOne({
      userId: auth.payload.sub,
      normalizedName,
    }).lean();

    if (existingTag) {
      return NextResponse.json(
        {
          success: false,
          message: "This tag already exists.",
        },
        { status: 409 },
      );
    }

    const tag = await Tag.create({
      userId: auth.payload.sub,
      name,
      normalizedName,
      color,
      isSystemDefault: false,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tag created successfully.",
        data: mapTag(tag),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create tag API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while creating tag.",
      },
      { status: 500 },
    );
  }
}
