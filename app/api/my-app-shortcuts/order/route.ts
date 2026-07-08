import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import {
  buildOrderedShortcutItems,
  type ShortcutOrderEntry,
  type ShortcutSource,
} from "@/lib/myAppShortcuts";
import { User } from "@/models/User";

type ReorderMyAppShortcutsBody = {
  shortcuts?: Array<{
    id?: string;
    source?: ShortcutSource;
  }>;
};

function toShortcutKey(entry: ShortcutOrderEntry) {
  return `${entry.source}:${entry.id}`;
}

async function getCurrentShortcutOrder(userId: string) {
  const user = await User.findById(userId)
    .select("myAppShortcutIds myCustomAppShortcuts myAppShortcutOrder")
    .lean();

  if (!user) {
    return null;
  }

  const orderedShortcuts = await buildOrderedShortcutItems({
    myAppShortcutIds: (user.myAppShortcutIds as Types.ObjectId[] | undefined) ?? [],
    myCustomAppShortcuts:
      (user.myCustomAppShortcuts as
        | Array<{
            _id: Types.ObjectId;
            url: string;
            category?: string;
            name?: string | null;
            title?: string | null;
            iconUrl?: string | null;
          }>
        | undefined) ?? [],
    myAppShortcutOrder:
      (user.myAppShortcutOrder as
        | Array<{ id: Types.ObjectId; source: ShortcutSource }>
        | undefined) ?? [],
  });

  return {
    user,
    order: orderedShortcuts.order,
    data: orderedShortcuts.data,
  };
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json()) as ReorderMyAppShortcutsBody;
    const shortcuts = Array.isArray(body.shortcuts) ? body.shortcuts : null;

    if (!shortcuts) {
      return NextResponse.json(
        {
          success: false,
          message: "shortcuts array is required.",
        },
        { status: 400 },
      );
    }

    const normalizedOrder: ShortcutOrderEntry[] = [];
    const seenKeys = new Set<string>();

    for (const item of shortcuts) {
      const id = item.id?.trim();
      const source = item.source;

      if (!id || !Types.ObjectId.isValid(id)) {
        return NextResponse.json(
          {
            success: false,
            message: "One or more shortcut IDs are invalid.",
          },
          { status: 400 },
        );
      }

      if (source !== "system" && source !== "custom") {
        return NextResponse.json(
          {
            success: false,
            message: "Each shortcut source must be either system or custom.",
          },
          { status: 400 },
        );
      }

      const entry = { id, source };
      const key = toShortcutKey(entry);

      if (seenKeys.has(key)) {
        return NextResponse.json(
          {
            success: false,
            message: "Duplicate shortcuts are not allowed in the order payload.",
          },
          { status: 400 },
        );
      }

      seenKeys.add(key);
      normalizedOrder.push(entry);
    }

    await connectToDatabase();

    const result = await getCurrentShortcutOrder(auth.payload.sub);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 },
      );
    }

    const allowedKeys = new Set(result.order.map(toShortcutKey));

    if (
      normalizedOrder.length !== result.order.length ||
      normalizedOrder.some((entry) => !allowedKeys.has(toShortcutKey(entry)))
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "shortcuts must include every current shortcut exactly once.",
        },
        { status: 400 },
      );
    }

    await User.findByIdAndUpdate(auth.payload.sub, {
      $set: {
        myAppShortcutOrder: normalizedOrder.map((entry) => ({
          id: new Types.ObjectId(entry.id),
          source: entry.source,
        })),
      },
    });

    return NextResponse.json({
      success: true,
      message: "App shortcut order updated successfully.",
      data: normalizedOrder
        .map((entry) =>
          result.data.find(
            (item) => item.id === entry.id && item.source === entry.source,
          ),
        )
        .filter(Boolean),
    });
  } catch (error) {
    console.error("Update my app shortcut order API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while updating your app shortcut order.",
      },
      { status: 500 },
    );
  }
}
