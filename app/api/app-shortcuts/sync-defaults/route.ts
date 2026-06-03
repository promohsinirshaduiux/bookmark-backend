// import { NextResponse } from "next/server";
// import { connectToDatabase } from "@/lib/db";
// import { defaultAppShortcuts } from "@/lib/defaultAppShortcuts";
// import { verifyAccessToken } from "@/lib/jwt";
// import { AppShortcut } from "@/models/AppShortcut";

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

//     try {
//       verifyAccessToken(token);
//     } catch {
//       return NextResponse.json(
//         { success: false, message: "Unauthorized: Invalid or expired token." },
//         { status: 401 }
//       );
//     }

//     await connectToDatabase();

//     const operations = defaultAppShortcuts.map((item) => ({
//       updateOne: {
//         filter: { url: item.url },
//         update: {
//           $setOnInsert: {
//             url: item.url,
//             category: item.category,
//             name: item.name ?? null,
//             title: item.title ?? item.name ?? null,
//             iconUrl: item.iconUrl ?? null,
//           },
//         },
//         upsert: true,
//       },
//     }));

//     const insertResult = await AppShortcut.bulkWrite(operations, { ordered: false });

//     const categoryBackfillOps = defaultAppShortcuts.map((item) => ({
//       updateOne: {
//         filter: {
//           url: item.url,
//           $or: [{ category: { $exists: false } }, { category: null }, { category: "Custom" }],
//         },
//         update: {
//           $set: {
//             category: item.category,
//             ...(item.name ? { name: item.name } : {}),
//             ...(item.title || item.name ? { title: item.title ?? item.name } : {}),
//           },
//         },
//       },
//     }));

//     const backfillResult = await AppShortcut.bulkWrite(categoryBackfillOps, {
//       ordered: false,
//     });

//     return NextResponse.json({
//       success: true,
//       message: "Default app shortcuts sync completed.",
//       insertedCount: insertResult.upsertedCount ?? 0,
//       matchedCount: insertResult.matchedCount ?? 0,
//       categoryBackfilledCount: backfillResult.modifiedCount ?? 0,
//     });
//   } catch (error) {
//     console.error("Sync default app shortcuts API error:", error);
//     return NextResponse.json(
//       { success: false, message: "Something went wrong while syncing default app shortcuts." },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { defaultAppShortcuts } from "@/lib/defaultAppShortcuts";
import { AppShortcut } from "@/models/AppShortcut";

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    await connectToDatabase();

    const operations = defaultAppShortcuts.map((item) => ({
      updateOne: {
        filter: { url: item.url },
        update: {
          $setOnInsert: {
            url: item.url,
            category: item.category,
            name: item.name ?? null,
            title: item.title ?? item.name ?? null,
            iconUrl: item.iconUrl ?? null,
          },
        },
        upsert: true,
      },
    }));

    const insertResult = await AppShortcut.bulkWrite(operations, {
      ordered: false,
    });

    const categoryBackfillOps = defaultAppShortcuts.map((item) => ({
      updateOne: {
        filter: {
          url: item.url,
          $or: [
            { category: { $exists: false } },
            { category: null },
            { category: "Custom" },
          ],
        },
        update: {
          $set: {
            category: item.category,
            ...(item.name ? { name: item.name } : {}),
            ...(item.title || item.name
              ? { title: item.title ?? item.name }
              : {}),
          },
        },
      },
    }));

    const backfillResult = await AppShortcut.bulkWrite(categoryBackfillOps, {
      ordered: false,
    });

    return NextResponse.json({
      success: true,
      message: "Default app shortcuts sync completed.",
      insertedCount: insertResult.upsertedCount ?? 0,
      matchedCount: insertResult.matchedCount ?? 0,
      categoryBackfilledCount: backfillResult.modifiedCount ?? 0,
    });
  } catch (error) {
    console.error("Sync default app shortcuts API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while syncing default app shortcuts.",
      },
      { status: 500 },
    );
  }
}
