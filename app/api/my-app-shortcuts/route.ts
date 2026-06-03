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

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json()) as AttachBody;
    const shortcutIds = normalizeIds(body);

    if (shortcutIds.length === 0) {
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

    const existingShortcuts = await AppShortcut.find({
      _id: { $in: shortcutIds },
    })
      .select("_id")
      .lean();

    if (existingShortcuts.length !== shortcutIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more app shortcuts were not found.",
        },
        { status: 404 },
      );
    }

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

    const existingIds = new Set(
      ((user.myAppShortcutIds as Types.ObjectId[] | undefined) ?? []).map((id) =>
        id.toString(),
      ),
    );
    const newShortcutIds = shortcutIds.filter((id) => !existingIds.has(id));

    if (newShortcutIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "All selected shortcuts are already attached to your account.",
        },
        { status: 409 },
      );
    }

    await User.findByIdAndUpdate(auth.payload.sub, {
      $addToSet: {
        myAppShortcutIds: {
          $each: newShortcutIds,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "App shortcuts attached to user successfully.",
      attachedCount: newShortcutIds.length,
    });
  } catch (error) {
    console.error("Attach my app shortcuts API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while attaching app shortcuts.",
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
      .select("myAppShortcutIds")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 },
      );
    }

    const shortcutIds =
      (user.myAppShortcutIds as Types.ObjectId[] | undefined)?.map((id) =>
        id.toString(),
      ) ?? [];

    const shortcuts = await AppShortcut.find({
      _id: { $in: shortcutIds },
    }).lean();

    const byId = new Map(shortcuts.map((s) => [s._id.toString(), s]));

    const ordered = shortcutIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((item) => ({
        id: item!._id.toString(),
        url: item!.url,
        category: item!.category ?? "Custom",
        name: item!.name ?? null,
        title: item!.title ?? null,
        iconUrl: item!.iconUrl ?? null,
      }));

    return NextResponse.json({
      success: true,
      data: ordered,
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
