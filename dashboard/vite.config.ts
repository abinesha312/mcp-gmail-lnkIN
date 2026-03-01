import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true, // Fail if port is already in use instead of trying another
    proxy: {
      "/api":  "http://localhost:3001",
      "/auth": "http://localhost:3001",
    },
  },
  optimizeDeps: {
    include: ["axios", "react", "react-dom"],
  },
});
