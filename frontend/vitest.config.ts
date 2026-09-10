import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "react-native": "react-native-web"
    }
  },
  test: {
    globals: false,
    setupFiles: ["./__tests__/setupTests.ts"]
  }
});
