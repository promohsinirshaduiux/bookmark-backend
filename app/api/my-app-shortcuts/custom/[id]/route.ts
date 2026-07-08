import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AppShortcut } from "@/models/AppShortcut";
import { User } from "@/models/User";

type UpdateMyCustomShortcutBody = {
  url?: string;
  title?: string;
};

type CustomShortcut = {
  _id: Types.ObjectId;
  url: string;
  category?: string;
  name?: string | null;
  title?: string | null;
  iconUrl?: string | null;
};

function mapCustomShortcut(shortcut: CustomShortcut) {
  return {
    id: shortcut._id.toString(),
    source: "custom" as const,
    url: shortcut.url,
    category: shortcut.category ?? "Custom",
    name: shortcut.name ?? null,
    title: shortcut.title ?? null,
    iconUrl: shortcut.iconUrl ?? null,
  };
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/my-app-shortcuts/custom/[id]">,
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
          message: "Invalid custom app shortcut ID.",
        },
        { status: 400 },
      );
    }

    const body = (await request.json()) as UpdateMyCustomShortcutBody;
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

      updates["myCustomAppShortcuts.$.url"] = url;
    }

    if (body.title !== undefined) {
      const title = body.title.trim();

      if (!title) {
        return NextResponse.json(
          {
            success: false,
            message: "title cannot be empty.",
          },
          { status: 400 },
        );
      }

      updates["myCustomAppShortcuts.$.title"] = title;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one of url or title is required.",
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const user = await User.findById(auth.payload.sub)
      .select("myAppShortcutIds myCustomAppShortcuts")
      .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 },
      );
    }

    const customShortcuts =
      (user.myCustomAppShortcuts as CustomShortcut[] | undefined) ?? [];
    const currentShortcut = customShortcuts.find((item) => item._id.toString() === id);

    if (!currentShortcut) {
      return NextResponse.json(
        {
          success: false,
          message: "Custom app shortcut not found.",
        },
        { status: 404 },
      );
    }

    const nextUrl =
      typeof updates["myCustomAppShortcuts.$.url"] === "string"
        ? (updates["myCustomAppShortcuts.$.url"] as string)
        : currentShortcut.url;

    const systemIds =
      ((user.myAppShortcutIds as Types.ObjectId[] | undefined) ?? []).map((item) =>
        item.toString(),
      );

    const attachedSystemShortcuts = systemIds.length
      ? await AppShortcut.find({ _id: { $in: systemIds } }).select("url").lean()
      : [];

    const existingSystemUrls = new Set(
      attachedSystemShortcuts.map((item) => item.url.toLowerCase()),
    );
    const existingCustomUrls = new Set(
      customShortcuts
        .filter((item) => item._id.toString() !== id)
        .map((item) => item.url.toLowerCase()),
    );

    if (
      existingSystemUrls.has(nextUrl.toLowerCase()) ||
      existingCustomUrls.has(nextUrl.toLowerCase())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "This shortcut already exists in your app shortcuts.",
        },
        { status: 409 },
      );
    }

    updates["myCustomAppShortcuts.$.updatedAt"] = new Date();

    const updatedUser = await User.findOneAndUpdate(
      { _id: auth.payload.sub, "myCustomAppShortcuts._id": id },
      { $set: updates },
      { new: true },
    )
      .select("myCustomAppShortcuts")
      .lean();

    const updatedShortcut = (
      updatedUser?.myCustomAppShortcuts as CustomShortcut[] | undefined
    )?.find((item) => item._id.toString() === id);

    if (!updatedShortcut) {
      return NextResponse.json(
        {
          success: false,
          message: "Custom app shortcut not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Custom app shortcut updated successfully.",
      data: mapCustomShortcut(updatedShortcut),
    });
  } catch (error) {
    console.error("Update custom my app shortcut API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while updating your custom app shortcut.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/my-app-shortcuts/custom/[id]">,
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
          message: "Invalid custom app shortcut ID.",
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const user = await User.findOneAndUpdate(
      { _id: auth.payload.sub, "myCustomAppShortcuts._id": id },
      {
        $pull: {
          myCustomAppShortcuts: { _id: new Types.ObjectId(id) },
          myAppShortcutOrder: {
            id: new Types.ObjectId(id),
            source: "custom",
          },
        },
      },
      { new: false },
    )
      .select("myCustomAppShortcuts")
      .lean();

    const deletedShortcut = (
      user?.myCustomAppShortcuts as CustomShortcut[] | undefined
    )?.find((item) => item._id.toString() === id);

    if (!deletedShortcut) {
      return NextResponse.json(
        {
          success: false,
          message: "Custom app shortcut not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Custom app shortcut deleted successfully.",
      data: mapCustomShortcut(deletedShortcut),
    });
  } catch (error) {
    console.error("Delete custom my app shortcut API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while deleting your custom app shortcut.",
      },
      { status: 500 },
    );
  }
}
