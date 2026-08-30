/**
 * Firebase Cloud Functions Entry Point
 * 
 * Wraps the Express application for deployment to Firebase Cloud Functions.
 * Handles HTTP request routing to the Express app and manages CORS headers.
 * 
 * Main Export:
 * - api: Cloud Function HTTP handler
 *   - Initializes routes on first request
 *   - Sets CORS headers for cross-origin requests
 *   - Routes all HTTP methods to Express app
 *   - Handles preflight OPTIONS requests
 * 
 * Features:
 * - Lazy initialization of routes (only on first request)
 * - CORS headers for development and production
 * - Support for all HTTP methods (GET, POST, PUT, DELETE, OPTIONS)
 * - Content-Type and other standard headers
 * 
 * Deployment:
 * - Deploy to Firebase Cloud Functions using: firebase deploy --only functions
 * - Access at: https://[project-region]-[project-id].cloudfunctions.net/api
 * 
 * Note: This is an alternative deployment method to the standard Express server.
 * Use this for serverless deployment on Firebase Cloud Functions.
 */

import * as functions from "firebase-functions";
import express from "express";
import { registerRoutes } from "./routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let isInitialized = false;

const initializeApp = async () => {
  if (isInitialized) return;
  await registerRoutes(app);
  isInitialized = true;
};

export const api = functions.https.onRequest(async (req, res) => {
  await initializeApp();
  
  // Set CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  app(req, res);
});
