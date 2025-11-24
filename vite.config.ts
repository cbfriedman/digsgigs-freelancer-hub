import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    mode === "development" && {
      name: 'spa-fallback',
      configureServer(server: any) {
        server.middlewares.use((req: any, res: any, next: any) => {
          const accept = req.headers.accept || '';
          // Only rewrite GET requests for HTML
          if (req.method === 'GET' && accept.includes('text/html')) {
            const url = req.url || '';
            // Don't rewrite if it has a file extension or is an API call
            if (!url.includes('.') && !url.startsWith('/api') && !url.startsWith('/@')) {
              req.url = '/index.html';
            }
          }
          next();
        });
      },
    },
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
