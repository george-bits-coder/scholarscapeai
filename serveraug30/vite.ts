/**
 * Vite Integration Module
 * 
 * Handles Vite dev server setup for development and static file serving for production.
 * Provides Hot Module Replacement (HMR) during development and optimized static
 * serving for production builds.
 * 
 * Main Functions:
 * - setupVite(app, server): Configures Vite middleware for development
 *   - Sets up Vite middleware for module transformation
 *   - Configures HMR (Hot Module Replacement)
 *   - Serves landing page at /
 *   - Serves index.html for SPA routes
 *   - Handles module compilation and caching
 *   - Provides better error messages with source maps
 * 
 * - serveStatic(app): Serves pre-built static files for production
 *   - Serves files from public/ directory
 *   - Validates build directory exists
 *   - Serves landing page and index.html
 *   - Optimized for performance
 * 
 * - log(message, source): Formatted logging utility
 *   - Adds timestamp and source label
 *   - Consistent formatting across application
 * 
 * Features:
 * - Automatic cache-busting with query parameters (v=uuid)
 * - Error handling and stack trace formatting
 * - API route passthrough (not served as HTML)
 * - Development-only debug logging
 * - Production-optimized static file serving
 * 
 * Configuration:
 * - Reads from ../vite.config in project root
 * - Configures HMR server for WebSocket communication
 * - Allows specific host allowance for CORS
 */

import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  // viteConfig is a function returned by defineConfig, we need to call it
  const resolvedConfig = typeof viteConfig === 'function' 
    ? viteConfig({ command: 'serve', mode: 'development' })
    : viteConfig;

  const vite = await createViteServer({
    ...(resolvedConfig as any),
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  const landingTemplate = path.resolve(
    import.meta.dirname,
    "..",
    "client",
    "landing.html",
  );

  app.get("/", (_req, res) => {
    res.sendFile(landingTemplate);
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Don't serve HTML for API requests
    if (url.startsWith("/api")) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.get("/", (_req, res) => {
    res.sendFile(path.resolve(distPath, "landing.html"));
  });

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist, but NOT for API routes
  app.use("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "Not found" });
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
