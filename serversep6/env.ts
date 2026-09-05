/**
 * Environment Configuration Module
 * 
 * Loads and validates environment variables from .env files.
 * Checks for required Firebase configuration variables.
 * 
 * Functionality:
 * - Loads environment variables from project root .env file
 * - Loads environment variables from server/.env file (overrides root)
 * - Validates that required Firebase variables are present
 * - Logs warnings if required variables are missing
 * 
 * Environment Variables Validated:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY
 * - FIREBASE_DATABASE_URL
 * 
 * Note: This module should be imported first in the application
 * to ensure all environment variables are loaded before use.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootEnv = path.resolve(__dirname, "../.env");
const localEnv = path.resolve(__dirname, ".env");

dotenv.config({ path: rootEnv });
dotenv.config({ path: localEnv });

const missing = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_DATABASE_URL",
].filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.warn(
    `Missing environment variables: ${missing.join(", ")}. ` +
      "Ensure .env is present in the project root or server folder and contains Firebase values.",
  );
}

if (!process.env.RESEND_API_KEY) {
  console.warn(
    "RESEND_API_KEY is missing. Account verification and password reset emails will not be delivered.",
  );
}
