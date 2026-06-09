import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    await connectToDatabase();

    const user = await User.findById(auth.payload.sub).lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "User fetched successfully.",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Get current user API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while fetching current user.",
      },
      { status: 500 },
    );
  }
}
