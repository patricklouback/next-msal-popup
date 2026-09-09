import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    environmentMatchGlobs: [
      ["src/react.spec.ts", "jsdom"],
      ["src/msal-interop.spec.ts", "jsdom"],
    ],
    environment: "node",
  },
});
