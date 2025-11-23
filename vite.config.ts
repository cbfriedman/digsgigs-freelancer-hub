import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// SPA fallback middleware for dev server
const spaFallbackMiddleware = () => {
  return {
    name: 'spa-fallback',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        // Skip if it's an API call or has file extension
        if (req.url.startsWith('/api') || req.url.includes('.')) {
          return next();
        }
        // Serve index.html for all other routes
        req.url = '/index.html';
        next();
      });
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    mode === "development" && spaFallbackMiddleware()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
}));
