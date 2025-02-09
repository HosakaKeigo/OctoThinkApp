import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		include: ["test/**/*.test.ts"],
		coverage: {
			provider: "v8",
		},
		clearMocks: true,
		env: {
			BACKEND_URL: "http://localhost:5001/vitest/us-central1/probot",
		},
		setupFiles: ["./test/setup.ts"],
	},
});
