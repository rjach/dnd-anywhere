import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    environment: "happy-dom",
    include: ["tests/unit/**/*.test.ts"],
    setupFiles: ["tests/unit/setup.ts"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/core/**", "src/settings/**", "src/shared/**", "src/adapters/**"],
      thresholds: { lines: 90, functions: 85, branches: 80, statements: 90 },
    },
  },
});
