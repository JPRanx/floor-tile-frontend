import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 4175, proxy: { "/api": "http://127.0.0.1:8014" } },
  preview: { port: 4175 },
  test: { globals: true, environment: "jsdom", setupFiles: ["./src/test-setup.ts"] },
});
