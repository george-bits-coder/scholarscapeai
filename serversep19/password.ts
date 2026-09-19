/**
 * Password Utilities Module
 * 
 * Provides secure password hashing and verification functions using scrypt.
 * Uses timing-safe comparison to prevent timing attacks during verification.
 * 
 * Main Functions:
 * - hashPassword(password): Hashes a plaintext password with scrypt and random salt
 *   Returns: "hash.salt" format string for storage
 * 
 * - comparePasswords(supplied, stored): Compares supplied password against stored hash
 *   Returns: Boolean indicating if passwords match
 *   Uses timing-safe comparison to prevent timing attacks
 * 
 * Security Features:
 * - Scrypt algorithm with 64-byte derivation
 * - Random salt generation for each password
 * - Timing-safe comparison to prevent timing attacks
 * - Error handling and validation
 * 
 * Usage:
 * - During registration: hash password with hashPassword()
 * - During login: compare with comparePasswords(suppliedPassword, storedHash)
 */

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
