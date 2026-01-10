import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // Listen on all network interfaces
    port: 8080,
    strictPort: false, // Allow port fallback if 8080 is busy
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 8080,
    },
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'map-vendor': ['mapbox-gl', '@turf/turf'],
          'chart-vendor': ['recharts'],
          'pdf-vendor': ['jspdf', 'jspdf-autotable'],
          'stripe-vendor': ['@stripe/stripe-js'],
        },
      },
    },
    chunkSizeWarningLimit: 2000, // Set limit to 2MB to suppress warnings for optimized chunks
  },
}));
