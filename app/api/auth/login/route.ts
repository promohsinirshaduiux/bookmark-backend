// import bcrypt from "bcryptjs";
// import { NextResponse } from "next/server";
// import { connectToDatabase } from "@/lib/db";
// import { signAccessToken } from "@/lib/jwt";
// import { User } from "@/models/User";

// type LoginBody = {
//   email?: string;
//   password?: string;
// };

// export async function POST(request: Request) {
//   try {
//     const body = (await request.json()) as LoginBody;
//     const email = body.email?.trim().toLowerCase();
//     const password = body.password;

//     if (!email || !password) {
//       return NextResponse.json(
//         { success: false, message: "email and password are required." },
//         { status: 400 }
//       );
//     }

//     await connectToDatabase();

//     const user = await User.findOne({ email });
//     if (!user) {
//       return NextResponse.json(
//         { success: false, message: "Invalid credentials." },
//         { status: 401 }
//       );
//     }

//     const isValidPassword = await bcrypt.compare(password, user.passwordHash);
//     if (!isValidPassword) {
//       return NextResponse.json(
//         { success: false, message: "Invalid credentials." },
//         { status: 401 }
//       );
//     }

//     const token = signAccessToken({
//       sub: user._id.toString(),
//       email: user.email,
//       name: user.name,
//     });

//     return NextResponse.json({
//       success: true,
//       message: "Login successful.",
//       token,
//       user: {
//         id: user._id.toString(),
//         name: user.name,
//         email: user.email,
//       },
//     });
//   } catch (error) {
//     console.error("Login API error:", error);
//     return NextResponse.json(
//       { success: false, message: "Something went wrong while logging in." },
//       { status: 500 }
//     );
//   }
// }

import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { signAccessToken } from "@/lib/jwt";
import { getAuthCookieOptions } from "@/lib/session";
import { User } from "@/models/User";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "email and password are required." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials." },
        { status: 401 },
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials." },
        { status: 401 },
      );
    }

    const token = signAccessToken({
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });

    response.cookies.set("access_token", token, getAuthCookieOptions());

    return response;
  } catch (error) {
    console.error("Login API error:", error);

    return NextResponse.json(
      { success: false, message: "Something went wrong while logging in." },
      { status: 500 },
    );
  }
}
