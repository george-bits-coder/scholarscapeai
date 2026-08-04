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
