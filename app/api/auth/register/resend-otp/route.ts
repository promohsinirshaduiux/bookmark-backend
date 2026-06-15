import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { PendingRegistration } from "@/models/PendingRegistration";
import { User } from "@/models/User";

type ResendRegisterOtpBody = {
  email?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResendRegisterOtpBody;
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "email is required." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      await PendingRegistration.deleteOne({ email });

      return NextResponse.json(
        { success: false, message: "Email is already registered. Please login." },
        { status: 409 },
      );
    }

    const pendingRegistration = await PendingRegistration.findOne({ email });

    if (!pendingRegistration) {
      return NextResponse.json(
        { success: false, message: "No pending registration found for this email." },
        { status: 404 },
      );
    }

    const registerOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(registerOtp).digest("hex");
    const otpExpiresAt = new Date(Date.now() + 1000 * 60 * 15);

    pendingRegistration.otpHash = otpHash;
    pendingRegistration.otpExpiresAt = otpExpiresAt;
    await pendingRegistration.save();

    return NextResponse.json({
      success: true,
      message: "Registration OTP resent successfully.",
      email,
      registerOtp,
      expiresInMinutes: 15,
    });
  } catch (error) {
    console.error("Resend register OTP API error:", error);

    return NextResponse.json(
      { success: false, message: "Something went wrong while resending registration OTP." },
      { status: 500 },
    );
  }
}
