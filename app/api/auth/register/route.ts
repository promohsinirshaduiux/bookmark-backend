import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { signAccessToken } from "@/lib/jwt";
import { getAuthCookieOptions } from "@/lib/session";
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
        { success: false, message: "Email is already registered." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const createdUser = await User.create({ name, email, passwordHash });

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
      { status: 201 }
    );

    response.cookies.set("access_token", token, getAuthCookieOptions());

    return response;
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong while registering." },
      { status: 500 }
    );
  }
}
