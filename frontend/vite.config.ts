import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite: dev-сервер на 5173, прокси к API для избежания CORS в разработке.
 * Backend по умолчанию — localhost:8000.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
  server: {
    port: 5173,
    // Если бэкенд на другом порту — поменяйте target (например 8001)
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
      "/uploads": { target: "http://127.0.0.1:8001", changeOrigin: true },
      "/docs": { target: "http://127.0.0.1:8001", changeOrigin: true },
      "/openapi.json": { target: "http://127.0.0.1:8001", changeOrigin: true },
    },
  },
});
