import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { boneyardPlugin } from "boneyard-js/vite";

const apiResolveDevPlugin = (): Plugin => ({
  name: "api-resolve-dev",
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url?.startsWith("/api/resolve")) {
        try {
          const { default: handler } = await import("./api/resolve.ts");
          const parsed = new URL(req.url, "http://localhost");
          const query: Record<string, string> = {};
          parsed.searchParams.forEach((v, k) => {
            query[k] = v;
          });
          (req as any).query = query;
          (res as any).status = (code: number) => {
            res.statusCode = code;
            return {
              json: (data: any) => {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(data));
              },
              end: () => res.end(),
            };
          };
          return handler(req as any, res as any);
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: err.message }));
          return;
        }
      } else if (req.url?.startsWith("/api/transcript")) {
        try {
          const { default: handler } = await import("./api/transcript.ts");
          const parsed = new URL(req.url, "http://localhost");
          const query: Record<string, string> = {};
          parsed.searchParams.forEach((v, k) => {
            query[k] = v;
          });
          (req as any).query = query;
          (res as any).status = (code: number) => {
            res.statusCode = code;
            return {
              json: (data: any) => {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(data));
              },
              end: () => res.end(),
            };
          };
          return handler(req as any, res as any);
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: err.message }));
          return;
        }
      } else if (req.url?.startsWith("/api/transcribe")) {
        try {
          const { default: handler } = await import("./api/transcribe.ts");
          const parsed = new URL(req.url, "http://localhost");
          const query: Record<string, string> = {};
          parsed.searchParams.forEach((v, k) => {
            query[k] = v;
          });
          (req as any).query = query;
          (res as any).status = (code: number) => {
            res.statusCode = code;
            return {
              json: (data: any) => {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(data));
              },
              end: () => res.end(),
            };
          };
          return handler(req as any, res as any);
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: err.message }));
          return;
        }
      } else if (req.url?.startsWith("/api/stream-download")) {
        try {
          const { default: handler } = await import("./api/stream-download.ts");
          const parsed = new URL(req.url, "http://localhost");
          const query: Record<string, string> = {};
          parsed.searchParams.forEach((v, k) => {
            query[k] = v;
          });
          (req as any).query = query;
          (res as any).status = (code: number) => {
            res.statusCode = code;
            return {
              json: (data: any) => {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(data));
              },
              end: () => res.end(),
            };
          };
          return handler(req as any, res as any);
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: err.message }));
          return;
        }
      }
      next();
    });
  },
});

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    open: false,
    watch: {
      ignored: ["**/dist/**", "**/node_modules/**"],
    },
  },
  plugins: [
    react(),
    boneyardPlugin(),
    apiResolveDevPlugin(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@supabase")) return "supabase";
            if (id.includes("hls.js")) return "hls-vendor";
            if (id.includes("lucide-react") || id.includes("framer-motion")) return "ui-vendor";
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) return "core-vendor";
          }
        },
      },
    },
  },
}));
