import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AppShortcut } from "@/models/AppShortcut";
import { User } from "@/models/User";

type CreateMyShortcutBody = {
  url?: string;
  category?: string;
  name?: string;
  title?: string;
  iconUrl?: string;
};

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json()) as CreateMyShortcutBody;
    const url = body.url?.trim();
    const category = body.category?.trim() || "Custom";
    const name = body.name?.trim() || null;
    const title = body.title?.trim() || null;
    const iconUrl = body.iconUrl?.trim() || null;

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          message: "url is required.",
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

    const systemIds =
      ((user.myAppShortcutIds as Types.ObjectId[] | undefined) ?? []).map((id) =>
        id.toString(),
      );

    const attachedSystemShortcuts = systemIds.length
      ? await AppShortcut.find({ _id: { $in: systemIds } }).select("url").lean()
      : [];

    const existingSystemUrls = new Set(
      attachedSystemShortcuts.map((item) => item.url.toLowerCase()),
    );
    const existingCustomUrls = new Set(
      ((user.myCustomAppShortcuts as
        | Array<{
            url: string;
          }>
        | undefined) ?? []).map((item) => item.url.toLowerCase()),
    );

    if (
      existingSystemUrls.has(url.toLowerCase()) ||
      existingCustomUrls.has(url.toLowerCase())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "This shortcut already exists in your app shortcuts.",
        },
        { status: 409 },
      );
    }

    await User.findByIdAndUpdate(auth.payload.sub, {
      $push: {
        myCustomAppShortcuts: {
          url,
          category,
          name,
          title,
          iconUrl,
        },
      },
    });

    const updatedUser = await User.findById(auth.payload.sub)
      .select("myCustomAppShortcuts")
      .lean();

    const createdShortcut = (
      updatedUser?.myCustomAppShortcuts as
        | Array<{
            _id: Types.ObjectId;
            url: string;
            category?: string;
            name?: string | null;
            title?: string | null;
            iconUrl?: string | null;
          }>
        | undefined
    )?.find((item) => item.url === url);

    return NextResponse.json(
      {
        success: true,
        message: "Custom app shortcut added to your account successfully.",
        data: createdShortcut
          ? {
              id: createdShortcut._id.toString(),
              source: "custom",
              url: createdShortcut.url,
              category: createdShortcut.category ?? "Custom",
              name: createdShortcut.name ?? null,
              title: createdShortcut.title ?? null,
              iconUrl: createdShortcut.iconUrl ?? null,
            }
          : null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create custom my app shortcut API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while creating your custom app shortcut.",
      },
      { status: 500 },
    );
  }
}
