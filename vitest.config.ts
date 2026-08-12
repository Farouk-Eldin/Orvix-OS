// PROPOSAL — target path: vitest.config.ts (new file)
// No test framework is configured in this project yet — this is required
// for the test file below to run at all. Also add to package.json:
//   devDependencies: "vitest": "^3.0.0"
//   scripts: "test": "vitest run", "test:watch": "vitest"

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
