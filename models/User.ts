import { model, models, Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    resetPasswordTokenHash: { type: String, default: null },
    resetPasswordExpiresAt: { type: Date, default: null },
    myAppShortcutIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "AppShortcut" }],
      default: [],
    },
    myCustomAppShortcuts: {
      type: [
        new Schema(
          {
            url: { type: String, required: true, trim: true },
            category: {
              type: String,
              required: true,
              trim: true,
              default: "Custom",
            },
            name: { type: String, trim: true, default: null },
            title: { type: String, trim: true, default: null },
            iconUrl: { type: String, trim: true, default: null },
          },
          { _id: true, timestamps: true },
        ),
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 }, { unique: true });

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: string };

export const User = models.User || model("User", userSchema);
