import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `${derivedKey.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.log("Password format error: missing hash or salt");
      return false;
    }

    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = scryptSync(supplied, salt, 64);

    if (hashedBuf.length !== suppliedBuf.length) {
      console.log(`Buffer length mismatch: stored=${hashedBuf.length}, supplied=${suppliedBuf.length}`);
      return false;
    }

    const result = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log(`Password comparison result: ${result}`);
    return result;
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}
