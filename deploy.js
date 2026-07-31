#!/usr/bin/env node
/**
 * Deploy script that ensures environment variables are loaded before building
 */

import dotenv from "dotenv";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env file
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Also try to load .env.production if it exists
try {
  dotenv.config({ path: path.resolve(__dirname, ".env.production") });
} catch (e) {
  // .env.production might not exist
}

console.log("Environment variables loaded from .env");
console.log(`VITE_API_BASE_URL: ${process.env.VITE_API_BASE_URL || "(not set)"}`);

// Run the build
try {
  console.log("\nBuilding application...");
  execSync("npm run build", { stdio: "inherit" });
  console.log("\nBuild completed successfully!");
  
  // Run Firebase deploy
  console.log("\nDeploying to Firebase...");
  execSync("firebase deploy --only hosting", { stdio: "inherit" });
  console.log("\nDeployment completed successfully!");
} catch (error) {
  console.error("Build or deployment failed:", error.message);
  process.exit(1);
}
