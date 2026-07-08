import { model, models, Schema } from "mongoose";

const bookmarkSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    url: { type: String, required: true, trim: true },
    normalizedUrl: { type: String, required: true, trim: true },
    title: { type: String, trim: true, default: null },
    description: { type: String, trim: true, default: null },
    iconUrl: { type: String, trim: true, default: null },
    tagIds: { type: [{ type: Schema.Types.ObjectId, ref: "Tag" }], default: [] },
    isArchive: { type: Boolean, default: false },
    order: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

bookmarkSchema.index({ userId: 1, normalizedUrl: 1 }, { unique: true });
bookmarkSchema.index({ userId: 1, isArchive: 1, order: 1 });

export const Bookmark = models.Bookmark || model("Bookmark", bookmarkSchema);
