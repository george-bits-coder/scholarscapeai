import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command, mode }) => {
  // Load environment variables explicitly
  const env = loadEnv(mode, process.cwd(), "");
  
  // Determine the backend URL
  // You might want to use an environment variable for this
  const backendUrl =  "https://scholarscapeai.onrender.com/"; // Change to your backend port
  
  return {
    plugins: [
      react(),
      runtimeErrorOverlay(),
      ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
        ? [
            import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "client", "index.html"),
          landing: path.resolve(__dirname, "client", "landing.html"),
        },
      },
    },
    server: {
      port: 5173, // Explicitly set frontend port
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          // This ensures the /api prefix is preserved
          rewrite: (path) => path,
        },
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});