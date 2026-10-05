import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: ["lib/seed/**", "lib/types.ts", "lib/constants.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "."),
    },
  },
});
