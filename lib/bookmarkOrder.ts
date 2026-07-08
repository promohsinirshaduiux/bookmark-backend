import { Bookmark } from "@/models/Bookmark";

export const BOOKMARK_ORDER_GAP = 1000;

function hasAssignedOrder(order: unknown) {
  return typeof order === "number" && Number.isFinite(order) && order > 0;
}

export async function ensureBookmarkOrders(userId: string, isArchive: boolean) {
  const unorderedCount = await Bookmark.countDocuments({
    userId,
    isArchive,
    $or: [
      { order: { $exists: false } },
      { order: null },
      { order: { $lte: 0 } },
    ],
  });

  if (unorderedCount === 0) {
    return;
  }

  const bookmarks = await Bookmark.find({ userId, isArchive })
    .select("_id order createdAt")
    .sort({ createdAt: -1, _id: 1 })
    .lean();

  if (bookmarks.length === 0) {
    return;
  }

  await Bookmark.bulkWrite(
    bookmarks.map((bookmark, index) => ({
      updateOne: {
        filter: { _id: bookmark._id },
        update: {
          $set: {
            order: (index + 1) * BOOKMARK_ORDER_GAP,
          },
        },
      },
    })),
  );
}

export async function getNextBookmarkOrder(userId: string, isArchive: boolean) {
  await ensureBookmarkOrders(userId, isArchive);

  const lastBookmark = await Bookmark.findOne({ userId, isArchive })
    .select("order")
    .sort({ order: -1, createdAt: -1, _id: -1 })
    .lean();

  if (!hasAssignedOrder(lastBookmark?.order)) {
    return BOOKMARK_ORDER_GAP;
  }

  return lastBookmark.order + BOOKMARK_ORDER_GAP;
}
