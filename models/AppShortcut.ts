import { model, models, Schema } from "mongoose";

const appShortcutSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, default: "Custom" },
    name: { type: String, trim: true, default: null },
    title: { type: String, trim: true, default: null },
    iconUrl: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

appShortcutSchema.index({ url: 1 }, { unique: true });

export const AppShortcut =
  models.AppShortcut || model("AppShortcut", appShortcutSchema);
