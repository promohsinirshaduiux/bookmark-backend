import { model, models, Schema, type InferSchemaType } from "mongoose";

const pendingRegistrationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    otpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  },
);

pendingRegistrationSchema.index({ email: 1 }, { unique: true });

export type PendingRegistrationDocument = InferSchemaType<typeof pendingRegistrationSchema> & {
  _id: string;
};

export const PendingRegistration =
  models.PendingRegistration || model("PendingRegistration", pendingRegistrationSchema);
