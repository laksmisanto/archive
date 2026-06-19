import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
const EXPIRY = process.env.JWT_EXPIRY || "8h";

if (!SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}
