import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { signAccessToken } from "@/lib/jwt";
import { getAuthCookieOptions } from "@/lib/session";
import { PendingRegistration } from "@/models/PendingRegistration";
import { User } from "@/models/User";

type VerifyRegisterOtpBody = {
  email?: string;
  otp?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyRegisterOtpBody;
    const email = body.email?.trim().toLowerCase();
    const otp = body.otp?.trim();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: "email and otp are required." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      await PendingRegistration.deleteOne({ email });

      return NextResponse.json(
        { success: false, message: "Email is already registered." },
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

    if (pendingRegistration.otpExpiresAt.getTime() < Date.now()) {
      await PendingRegistration.deleteOne({ _id: pendingRegistration._id });

      return NextResponse.json(
        { success: false, message: "OTP has expired. Please register again." },
        { status: 400 },
      );
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    if (otpHash !== pendingRegistration.otpHash) {
      return NextResponse.json(
        { success: false, message: "Invalid OTP." },
        { status: 400 },
      );
    }

    const createdUser = await User.create({
      name: pendingRegistration.name,
      email: pendingRegistration.email,
      passwordHash: pendingRegistration.passwordHash,
    });

    await PendingRegistration.deleteOne({ _id: pendingRegistration._id });

    const token = signAccessToken({
      sub: createdUser._id.toString(),
      email: createdUser.email,
      name: createdUser.name,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "User registered successfully.",
        user: {
          id: createdUser._id.toString(),
          name: createdUser.name,
          email: createdUser.email,
        },
      },
      { status: 201 },
    );

    response.cookies.set("access_token", token, getAuthCookieOptions());

    return response;
  } catch (error) {
    console.error("Verify register OTP API error:", error);

    return NextResponse.json(
      { success: false, message: "Something went wrong while verifying registration OTP." },
      { status: 500 },
    );
  }
}
