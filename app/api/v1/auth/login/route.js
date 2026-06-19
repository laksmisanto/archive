import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/User";
import ActivityLog from "@/lib/db/models/ActivityLog";
import { signToken } from "@/lib/auth/jwt";
import { rateLimit } from "@/lib/middleware/rateLimit";
import { ok, err, serverError } from "@/lib/utils/apiResponse";

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) return err("Username and password required");

    const normalizedUsername = username.toLowerCase().trim();
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp =
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateKey = `login:${clientIp}:${normalizedUsername}`;

    if (!rateLimit(rateKey, 5, 60_000)) {
      const response = err(
        "Too many login attempts. Please try again in a minute.",
        429,
      );
      response.headers.set("Retry-After", "60");
      return response;
    }

    await connectDB();
    const user = await User.findOne({
      username: normalizedUsername,
      isActive: true,
      deletedAt: null,
    })
      .select("+passwordHash")
      .lean();

    if (!user) return err("Invalid credentials", 401);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return err("Invalid credentials", 401);

    const token = signToken({ sub: user._id.toString(), role: user.role });

    await ActivityLog.create({
      userId: user._id,
      username: user.username,
      action: "LOGIN",
      ip: clientIp,
    });

    const response = ok({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set("nams_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    });

    return response;
  } catch (e) {
    return serverError(e);
  }
}
