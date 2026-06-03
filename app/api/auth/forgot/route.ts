import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

type ForgotBody = {
  email?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ForgotBody;
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "email is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email });
    let resetOtp: string | null = null;

    if (user) {
      const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = crypto.createHash("sha256").update(rawOtp).digest("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 15);

      user.resetPasswordTokenHash = otpHash;
      user.resetPasswordExpiresAt = expiresAt;
      await user.save();
      resetOtp = rawOtp;
    }

    return NextResponse.json({
      success: true,
      message: "If this email exists, an OTP has been prepared for password reset.",
      ...(resetOtp
        ? {
            resetOtp,
            expiresInMinutes: 15,
          }
        : {}),
    });
  } catch (error) {
    console.error("Forgot API error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong while processing forgot password." },
      { status: 500 }
    );
  }
}
