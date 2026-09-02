/**
 * Main Server Entry Point
 * 
 * Initializes and configures the Express server with all middleware and routes.
 * Handles both development mode (with Vite) and production mode (static files).
 * 
 * Configuration:
 * - CORS enabled for all origins with credentials
 * - JSON and URL-encoded body parsing
 * - Request logging middleware for API calls
 * - Health check endpoint at GET /api/hi
 * - Error handling middleware
 * 
 * Startup Process:
 * 1. Load environment variables
 * 2. Initialize Express app with middleware
 * 3. Register all API routes
 * 4. Setup Vite (development) or static serving (production)
 * 5. Start server on specified port (default 8080)
 * 
 * Middleware Pipeline:
 * - CORS headers setup
 * - Body parsers (JSON, URL-encoded)
 * - Request logging and response capturing
 * - Route handlers (from routes.ts)
 * - Error handler (catches all errors and returns JSON)
 * - Vite/Static file serving (must be last)
 */

import "./env";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/api/hi", (_req, res) => {
  res.json({ status: "ok" });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '8080', 10);
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
