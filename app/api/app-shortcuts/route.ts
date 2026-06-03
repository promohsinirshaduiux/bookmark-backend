// import { NextResponse } from "next/server";
// import { connectToDatabase } from "@/lib/db";
// import { defaultAppShortcuts } from "@/lib/defaultAppShortcuts";
// import { verifyAccessToken } from "@/lib/jwt";
// import { AppShortcut } from "@/models/AppShortcut";
// import { User } from "@/models/User";

// type CreateShortcutBody = {
//   url?: string;
//   category?: string;
//   name?: string;
//   title?: string;
//   iconUrl?: string;
// };

// export async function GET(request: Request) {
//   try {
//     const authHeader = request.headers.get("authorization");
//     const token = authHeader?.startsWith("Bearer ")
//       ? authHeader.slice(7).trim()
//       : null;

//     if (!token) {
//       return NextResponse.json(
//         { success: false, message: "Unauthorized: Bearer token is required." },
//         { status: 401 }
//       );
//     }

//     try {
//       verifyAccessToken(token);
//     } catch {
//       return NextResponse.json(
//         { success: false, message: "Unauthorized: Invalid or expired token." },
//         { status: 401 }
//       );
//     }

//     await connectToDatabase();
//     const totalCount = await AppShortcut.countDocuments();

//     if (totalCount === 0) {
//       await AppShortcut.insertMany(defaultAppShortcuts, { ordered: false });
//     }

//     const shortcuts = await AppShortcut.find().sort({ createdAt: -1 }).lean();

//     return NextResponse.json({
//       success: true,
//       data: shortcuts.map((item) => ({
//         id: item._id.toString(),
//         url: item.url,
//         category: item.category ?? "Custom",
//         name: item.name ?? null,
//         title: item.title ?? null,
//         iconUrl: item.iconUrl ?? null,
//       })),
//     });
//   } catch (error) {
//     console.error("Get app shortcuts API error:", error);
//     return NextResponse.json(
//       { success: false, message: "Something went wrong while fetching app shortcuts." },
//       { status: 500 }
//     );
//   }
// }

// export async function POST(request: Request) {
//   try {
//     const authHeader = request.headers.get("authorization");
//     const token = authHeader?.startsWith("Bearer ")
//       ? authHeader.slice(7).trim()
//       : null;

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

//     const body = (await request.json()) as CreateShortcutBody;
//     const url = body.url?.trim();
//     const category = body.category?.trim() || "Custom";
//     const name = body.name?.trim() || null;
//     const title = body.title?.trim() || null;
//     const iconUrl = body.iconUrl?.trim() || null;

//     if (!url) {
//       return NextResponse.json(
//         { success: false, message: "url is required." },
//         { status: 400 }
//       );
//     }

//     await connectToDatabase();

//     const exists = await AppShortcut.findOne({ url }).lean();
//     if (exists) {
//       await User.findByIdAndUpdate(payload.sub, {
//         $addToSet: { myAppShortcutIds: exists._id },
//       });

//       return NextResponse.json({
//         success: true,
//         message: "URL already exists and has been attached to your shortcuts.",
//         data: {
//           id: exists._id.toString(),
//           url: exists.url,
//           category: exists.category ?? "Custom",
//           name: exists.name ?? null,
//           title: exists.title ?? null,
//           iconUrl: exists.iconUrl ?? null,
//         },
//       });
//     }

//     const created = await AppShortcut.create({ url, category, name, title, iconUrl });
//     await User.findByIdAndUpdate(payload.sub, {
//       $addToSet: { myAppShortcutIds: created._id },
//     });

//     return NextResponse.json(
//       {
//         success: true,
//         message: "App shortcut added and attached successfully.",
//         data: {
//           id: created._id.toString(),
//           url: created.url,
//           category: created.category ?? "Custom",
//           name: created.name ?? null,
//           title: created.title ?? null,
//           iconUrl: created.iconUrl ?? null,
//         },
//       },
//       { status: 201 }
//     );
//   } catch (error) {
//     console.error("Create app shortcut API error:", error);
//     return NextResponse.json(
//       { success: false, message: "Something went wrong while creating app shortcut." },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { defaultAppShortcuts } from "@/lib/defaultAppShortcuts";
import { AppShortcut } from "@/models/AppShortcut";

type CreateShortcutBody = {
  url?: string;
  category?: string;
  name?: string;
  title?: string;
  iconUrl?: string;
};

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    await connectToDatabase();

    const totalCount = await AppShortcut.countDocuments();

    if (totalCount === 0) {
      await AppShortcut.insertMany(defaultAppShortcuts, {
        ordered: false,
      });
    }

    const shortcuts = await AppShortcut.find().sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      data: shortcuts.map((item) => ({
        id: item._id.toString(),
        url: item.url,
        category: item.category ?? "Custom",
        name: item.name ?? null,
        title: item.title ?? null,
        iconUrl: item.iconUrl ?? null,
      })),
    });
  } catch (error) {
    console.error("Get app shortcuts API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while fetching app shortcuts.",
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

    const body = (await request.json()) as CreateShortcutBody;

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

    const exists = await AppShortcut.findOne({ url }).lean();

    if (exists) {
      return NextResponse.json(
        {
          success: false,
          message: "This URL already exists in system app shortcuts.",
        },
        { status: 409 },
      );
    }

    const created = await AppShortcut.create({
      url,
      category,
      name,
      title,
      iconUrl,
    });

    return NextResponse.json(
      {
        success: true,
        message: "App shortcut added successfully.",
        data: {
          id: created._id.toString(),
          url: created.url,
          category: created.category ?? "Custom",
          name: created.name ?? null,
          title: created.title ?? null,
          iconUrl: created.iconUrl ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create app shortcut API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while creating app shortcut.",
      },
      { status: 500 },
    );
  }
}
