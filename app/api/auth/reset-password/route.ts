import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

type ResetPasswordBody = {
  email?: string;
  otp?: string;
  newPassword?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResetPasswordBody;
    const email = body.email?.trim().toLowerCase();
    const otp = body.otp?.trim();
    const newPassword = body.newPassword;

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { success: false, message: "email, otp and newPassword are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: "newPassword must be at least 8 characters." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const user = await User.findOne({
      email,
      resetPasswordTokenHash: otpHash,
      resetPasswordExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired OTP." },
        { status: 400 }
      );
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpiresAt = null;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    console.error("Reset password API error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong while resetting password." },
      { status: 500 }
    );
  }
}
