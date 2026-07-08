// import { Types } from "mongoose";
// import { NextResponse } from "next/server";
// import { connectToDatabase } from "@/lib/db";
// import { verifyAccessToken } from "@/lib/jwt";
// import { AppShortcut } from "@/models/AppShortcut";
// import { User } from "@/models/User";

// type AttachBody = {
//   appShortcutId?: string;
//   appShortcutIds?: string[];
// };

// function getBearerToken(request: Request) {
//   const authHeader = request.headers.get("authorization");
//   if (!authHeader?.startsWith("Bearer ")) return null;
//   return authHeader.slice(7).trim();
// }

// function normalizeIds(body: AttachBody) {
//   const ids = new Set<string>();
//   if (body.appShortcutId) ids.add(body.appShortcutId.trim());
//   if (Array.isArray(body.appShortcutIds)) {
//     for (const id of body.appShortcutIds) {
//       if (typeof id === "string" && id.trim()) ids.add(id.trim());
//     }
//   }
//   return [...ids];
// }

// export async function POST(request: Request) {
//   try {
//     const token = getBearerToken(request);
//     if (!token) {
//       return NextResponse.json(
//         { success: false, message: "Unauthorized: Bearer token is required." },
//         { status: 401 }
//       );
//     }

//     let payload;
//     try {
//       payload = verifyAccessToken(token);
//     } catch {
//       return NextResponse.json(
//         { success: false, message: "Unauthorized: Invalid or expired token." },
//         { status: 401 }
//       );
//     }

//     const body = (await request.json()) as AttachBody;
//     const shortcutIds = normalizeIds(body);
//     if (shortcutIds.length === 0) {
//       return NextResponse.json(
//         { success: false, message: "appShortcutId or appShortcutIds is required." },
//         { status: 400 }
//       );
//     }

//     if (!shortcutIds.every((id) => Types.ObjectId.isValid(id))) {
//       return NextResponse.json(
//         { success: false, message: "One or more app shortcut IDs are invalid." },
//         { status: 400 }
//       );
//     }

//     await connectToDatabase();

//     const existingShortcuts = await AppShortcut.find({
//       _id: { $in: shortcutIds },
//     })
//       .select("_id")
//       .lean();

//     if (existingShortcuts.length !== shortcutIds.length) {
//       return NextResponse.json(
//         { success: false, message: "One or more app shortcuts were not found." },
//         { status: 404 }
//       );
//     }

//     const user = await User.findByIdAndUpdate(
//       payload.sub,
//       { $addToSet: { myAppShortcutIds: { $each: shortcutIds } } },
//       { new: true }
//     );

//     if (!user) {
//       return NextResponse.json(
//         { success: false, message: "User not found." },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       message: "App shortcuts attached to user successfully.",
//       attachedCount: shortcutIds.length,
//     });
//   } catch (error) {
//     console.error("Attach my app shortcuts API error:", error);
//     return NextResponse.json(
//       { success: false, message: "Something went wrong while attaching app shortcuts." },
//       { status: 500 }
//     );
//   }
// }

// export async function GET(request: Request) {
//   try {
//     const token = getBearerToken(request);
//     if (!token) {
//       return NextResponse.json(
//         { success: false, message: "Unauthorized: Bearer token is required." },
//         { status: 401 }
//       );
//     }

//     let payload;
//     try {
//       payload = verifyAccessToken(token);
//     } catch {
//       return NextResponse.json(
//         { success: false, message: "Unauthorized: Invalid or expired token." },
//         { status: 401 }
//       );
//     }

//     await connectToDatabase();

//     const user = await User.findById(payload.sub).select("myAppShortcutIds").lean();
//     if (!user) {
//       return NextResponse.json(
//         { success: false, message: "User not found." },
//         { status: 404 }
//       );
//     }

//     const shortcutIds = (user.myAppShortcutIds as Types.ObjectId[] | undefined)?.map((id) =>
//       id.toString()
//     ) ?? [];
//     const shortcuts = await AppShortcut.find({ _id: { $in: shortcutIds } }).lean();

//     const byId = new Map(shortcuts.map((s) => [s._id.toString(), s]));
//     const ordered = shortcutIds
//       .map((id) => byId.get(id))
//       .filter(Boolean)
//       .map((item) => ({
//         id: item!._id.toString(),
//         url: item!.url,
//         category: item!.category ?? "Custom",
//         name: item!.name ?? null,
//         title: item!.title ?? null,
//         iconUrl: item!.iconUrl ?? null,
//       }));

//     return NextResponse.json({ success: true, data: ordered });
//   } catch (error) {
//     console.error("Get my app shortcuts API error:", error);
//     return NextResponse.json(
//       { success: false, message: "Something went wrong while fetching my app shortcuts." },
//       { status: 500 }
//     );
//   }
// }

import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { buildOrderedShortcutItems } from "@/lib/myAppShortcuts";
import { AppShortcut } from "@/models/AppShortcut";
import { User } from "@/models/User";

type AttachBody = {
  appShortcutId?: string;
  appShortcutIds?: string[];
};

function normalizeIds(body: AttachBody) {
  const ids = new Set<string>();

  if (body.appShortcutId) ids.add(body.appShortcutId.trim());

  if (Array.isArray(body.appShortcutIds)) {
    for (const id of body.appShortcutIds) {
      if (typeof id === "string" && id.trim()) {
        ids.add(id.trim());
      }
    }
  }

  return [...ids];
}

function hasShortcutSelection(body: AttachBody) {
  if (typeof body.appShortcutId === "string" && body.appShortcutId.trim()) {
    return true;
  }

  return Array.isArray(body.appShortcutIds);
}

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json()) as AttachBody;
    const hasSelection = hasShortcutSelection(body);
    const shortcutIds = normalizeIds(body);

    if (!hasSelection) {
      return NextResponse.json(
        {
          success: false,
          message: "appShortcutId or appShortcutIds is required.",
        },
        { status: 400 },
      );
    }

    if (!shortcutIds.every((id) => Types.ObjectId.isValid(id))) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more app shortcut IDs are invalid.",
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const user = await User.findByIdAndUpdate(
      auth.payload.sub,
      {},
      { new: true },
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 },
      );
    }

    const customShortcutIds = new Set(
      (
        user.myCustomAppShortcuts as
          | Array<{ _id: Types.ObjectId }>
          | undefined
      )?.map((item) => item._id.toString()) ?? [],
    );
    const systemShortcutIds = shortcutIds.filter((id) => !customShortcutIds.has(id));

    const existingShortcuts = await AppShortcut.find({
      _id: { $in: systemShortcutIds },
    })
      .select("_id")
      .lean();

    if (existingShortcuts.length !== systemShortcutIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more app shortcuts were not found.",
        },
        { status: 404 },
      );
    }

    const existingSystemIds =
      ((user.myAppShortcutIds as Types.ObjectId[] | undefined) ?? []).map((id) =>
        id.toString(),
      );
    const incomingIds = new Set(systemShortcutIds);
    const existingIdsSet = new Set(existingSystemIds);
    const shortcutIdsToRemove = existingSystemIds.filter((id) => !incomingIds.has(id));
    const shortcutIdsToAdd = systemShortcutIds.filter((id) => !existingIdsSet.has(id));
    const currentCustomOrderEntries = (
      (user.myAppShortcutOrder as
        | Array<{ id: Types.ObjectId; source: "system" | "custom" }>
        | undefined) ?? []
    ).filter((entry) => entry.source === "custom");

    await User.findByIdAndUpdate(auth.payload.sub, {
      $set: {
        myAppShortcutIds: systemShortcutIds.map((id) => new Types.ObjectId(id)),
        myAppShortcutOrder: [
          ...currentCustomOrderEntries.map((entry) => ({
            id: new Types.ObjectId(entry.id.toString()),
            source: "custom" as const,
          })),
          ...systemShortcutIds.map((id) => ({
            id: new Types.ObjectId(id),
            source: "system" as const,
          })),
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: "App shortcuts replaced successfully.",
      addedCount: shortcutIdsToAdd.length,
      removedCount: shortcutIdsToRemove.length,
    });
  } catch (error) {
    console.error("Replace my app shortcuts API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while replacing app shortcuts.",
      },
      { status: 500 },
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

    const user = await User.findById(auth.payload.sub)
      .select("myAppShortcutIds myCustomAppShortcuts myAppShortcutOrder")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 },
      );
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
          | Array<{ id: Types.ObjectId; source: "system" | "custom" }>
          | undefined) ?? [],
    });

    return NextResponse.json({
      success: true,
      data: orderedShortcuts.data,
    });
  } catch (error) {
    console.error("Get my app shortcuts API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while fetching my app shortcuts.",
      },
      { status: 500 },
    );
  }
}
