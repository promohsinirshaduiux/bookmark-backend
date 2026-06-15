import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { PendingRegistration } from "@/models/PendingRegistration";
import { User } from "@/models/User";

type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "name, email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "password must be at least 8 characters." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email is already registered. Please login." },
        { status: 409 },
      );
    }

    const existingPendingRegistration = await PendingRegistration.findOne({ email }).lean();

    if (existingPendingRegistration) {
      return NextResponse.json(
        {
          success: false,
          message: "Registration is pending verification. Please verify OTP or resend OTP.",
          email,
          requiresVerification: true,
          canResendOtp: true,
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const registerOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(registerOtp).digest("hex");
    const otpExpiresAt = new Date(Date.now() + 1000 * 60 * 15);

    await PendingRegistration.findOneAndUpdate(
      { email },
      {
        name,
        email,
        passwordHash,
        otpHash,
        otpExpiresAt,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    return NextResponse.json(
      {
        success: true,
        message: "Registration OTP generated successfully.",
        email,
        registerOtp,
        expiresInMinutes: 15,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong while starting registration." },
      { status: 500 },
    );
  }
}
