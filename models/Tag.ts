import { model, models, Schema } from "mongoose";

const tagSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    isSystemDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

tagSchema.index({ userId: 1, normalizedName: 1 }, { unique: true });

export const Tag = models.Tag || model("Tag", tagSchema);
