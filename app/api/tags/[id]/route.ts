import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Bookmark } from "@/models/Bookmark";
import { Tag } from "@/models/Tag";
import { normalizeTagName } from "@/lib/tags";

type UpdateTagBody = {
  name?: string;
  color?: string;
};

function mapTag(tag: {
  _id: { toString(): string };
  name: string;
  color: string;
  isSystemDefault?: boolean;
}) {
  return {
    id: tag._id.toString(),
    name: tag.name,
    color: tag.color,
    isSystemDefault: tag.isSystemDefault ?? false,
  };
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/tags/[id]">,
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

    const body = (await request.json()) as UpdateTagBody;
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = body.name.trim();

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message: "name cannot be empty.",
          },
          { status: 400 },
        );
      }

      updates.name = name;
      updates.normalizedName = normalizeTagName(name);
    }

    if (body.color !== undefined) {
      const color = body.color.trim();

      if (!color) {
        return NextResponse.json(
          {
            success: false,
            message: "color cannot be empty.",
          },
          { status: 400 },
        );
      }

      updates.color = color;
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

    if (updates.normalizedName) {
      const duplicate = await Tag.findOne({
        _id: { $ne: id },
        userId: auth.payload.sub,
        normalizedName: updates.normalizedName,
      }).lean();

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message: "This tag name already exists.",
          },
          { status: 409 },
        );
      }
    }

    const updatedTag = await Tag.findOneAndUpdate(
      { _id: id, userId: auth.payload.sub },
      { $set: updates },
      { new: true },
    ).lean();

    if (!updatedTag) {
      return NextResponse.json(
        {
          success: false,
          message: "Tag not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tag updated successfully.",
      data: mapTag(updatedTag),
    });
  } catch (error) {
    console.error("Update tag API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while updating tag.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/tags/[id]">,
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

    const deletedTag = await Tag.findOneAndDelete({
      _id: id,
      userId: auth.payload.sub,
    }).lean();

    if (!deletedTag) {
      return NextResponse.json(
        {
          success: false,
          message: "Tag not found.",
        },
        { status: 404 },
      );
    }

    await Bookmark.updateMany(
      { userId: auth.payload.sub, tagIds: id },
      { $pull: { tagIds: new Types.ObjectId(id) } },
    );

    return NextResponse.json({
      success: true,
      message: "Tag deleted successfully.",
    });
  } catch (error) {
    console.error("Delete tag API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while deleting tag.",
      },
      { status: 500 },
    );
  }
}
