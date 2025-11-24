// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///home/project/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "development" && {
      name: "spa-fallback",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const accept = req.headers.accept || "";
          if (req.method === "GET" && accept.includes("text/html")) {
            const url = req.url || "";
            if (!url.includes(".") && !url.startsWith("/api") && !url.startsWith("/@")) {
              req.url = "/index.html";
            }
          }
          next();
        });
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts"
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiOjpcIixcbiAgICBwb3J0OiA4MDgwLFxuICB9LFxuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSwgXG4gICAgbW9kZSA9PT0gXCJkZXZlbG9wbWVudFwiICYmIGNvbXBvbmVudFRhZ2dlcigpLFxuICAgIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiB7XG4gICAgICBuYW1lOiAnc3BhLWZhbGxiYWNrJyxcbiAgICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXI6IGFueSkge1xuICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKChyZXE6IGFueSwgcmVzOiBhbnksIG5leHQ6IGFueSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGFjY2VwdCA9IHJlcS5oZWFkZXJzLmFjY2VwdCB8fCAnJztcbiAgICAgICAgICAvLyBPbmx5IHJld3JpdGUgR0VUIHJlcXVlc3RzIGZvciBIVE1MXG4gICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnICYmIGFjY2VwdC5pbmNsdWRlcygndGV4dC9odG1sJykpIHtcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwgfHwgJyc7XG4gICAgICAgICAgICAvLyBEb24ndCByZXdyaXRlIGlmIGl0IGhhcyBhIGZpbGUgZXh0ZW5zaW9uIG9yIGlzIGFuIEFQSSBjYWxsXG4gICAgICAgICAgICBpZiAoIXVybC5pbmNsdWRlcygnLicpICYmICF1cmwuc3RhcnRzV2l0aCgnL2FwaScpICYmICF1cmwuc3RhcnRzV2l0aCgnL0AnKSkge1xuICAgICAgICAgICAgICByZXEudXJsID0gJy9pbmRleC5odG1sJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgfSxcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgdGVzdDoge1xuICAgIGdsb2JhbHM6IHRydWUsXG4gICAgZW52aXJvbm1lbnQ6IFwianNkb21cIixcbiAgICBzZXR1cEZpbGVzOiBcIi4vc3JjL3Rlc3Qvc2V0dXAudHNcIixcbiAgfSxcbn0pKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1QjtBQUhoQyxJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixTQUFTLGlCQUFpQixnQkFBZ0I7QUFBQSxJQUMxQyxTQUFTLGlCQUFpQjtBQUFBLE1BQ3hCLE1BQU07QUFBQSxNQUNOLGdCQUFnQixRQUFhO0FBQzNCLGVBQU8sWUFBWSxJQUFJLENBQUMsS0FBVSxLQUFVLFNBQWM7QUFDeEQsZ0JBQU0sU0FBUyxJQUFJLFFBQVEsVUFBVTtBQUVyQyxjQUFJLElBQUksV0FBVyxTQUFTLE9BQU8sU0FBUyxXQUFXLEdBQUc7QUFDeEQsa0JBQU0sTUFBTSxJQUFJLE9BQU87QUFFdkIsZ0JBQUksQ0FBQyxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxXQUFXLE1BQU0sS0FBSyxDQUFDLElBQUksV0FBVyxJQUFJLEdBQUc7QUFDMUUsa0JBQUksTUFBTTtBQUFBLFlBQ1o7QUFBQSxVQUNGO0FBQ0EsZUFBSztBQUFBLFFBQ1AsQ0FBQztBQUFBLE1BQ0g7QUFBQSxJQUNGO0FBQUEsRUFDRixFQUFFLE9BQU8sT0FBTztBQUFBLEVBQ2hCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLFNBQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLFlBQVk7QUFBQSxFQUNkO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
