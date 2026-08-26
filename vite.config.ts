import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const sqlLoader = () => ({
  name: "sql-loader",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (id.endsWith(".sql")) {
      return `export default ${JSON.stringify(code)};`;
    }
  }
});

export default defineConfig({
  plugins: [react(), sqlLoader()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:8787", changeOrigin: true }
    }
  }
});
