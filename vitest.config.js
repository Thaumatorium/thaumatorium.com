import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		include: ["tests/html-cleaner/*.test.js"],
	},
});
