import {
	afterEach,
	beforeEach,
	describe,
	expect,
	type Mock,
	test,
	vi,
} from "vitest";
import { octoThink } from "../src/index";

const { mockMiddleware } = vi.hoisted(() => {
	return {
		mockMiddleware: vi.fn(),
	};
});
vi.mock("probot", () => {
	return {
		Probot: vi.fn(),
		createNodeMiddleware: vi.fn().mockReturnValue(mockMiddleware),
	};
});

describe("firebase entrypoint", () => {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	let mockReq: any;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	let mockRes: any;

	describe("validate environment variables", () => {
		beforeEach(() => {
			process.env = {};

			mockReq = {
				method: "POST",
				headers: {},
				body: {},
			};

			mockRes = {
				status: vi.fn().mockReturnThis(),
				send: vi.fn().mockReturnThis(),
			};

			vi.spyOn(console, "error").mockImplementation(() => {});
		});

		test("throw error if required environment variables are missing", async () => {
			octoThink(mockReq, mockRes);

			expect((console.error as Mock).mock.calls[0][0]).toContain("Invalid env");
			expect(mockRes.status).toHaveBeenCalledWith(500);
			expect(mockRes.send).toHaveBeenCalledWith("Internal Server Error");
		});

		test("throw error if required environment secrets are missing", async () => {
			process.env.BACKEND_URL = "https://example.com";

			octoThink(mockReq, mockRes);

			expect((console.error as Mock).mock.calls[0][0]).toContain("Invalid env");
			expect(mockRes.status).toHaveBeenCalledWith(500);
			expect(mockRes.send).toHaveBeenCalledWith("Internal Server Error");
		});

		test("return environment variables if they are valid", async () => {
			process.env.BACKEND_URL = "https://example.com";
			process.env.GITHUB_BOT_CONFIG = JSON.stringify({
				APP_ID: "123",
				PRIVATE_KEY: "private-key",
				WEBHOOK_SECRET: "webhook-secret",
			});

			octoThink(mockReq, mockRes);

			expect(console.error as Mock).not.toHaveBeenCalled();
			expect(mockRes.status).not.toHaveBeenCalled();
			expect(mockRes.send).not.toHaveBeenCalled();
			expect(mockMiddleware).toHaveBeenCalledWith(mockReq, mockRes);
		});
	});

	describe("validate secret", () => {
		beforeEach(() => {
			process.env = {
				BACKEND_URL: "https://example.com",
			};

			mockReq = {
				method: "POST",
				headers: {},
				body: {},
			};

			mockRes = {
				status: vi.fn().mockReturnThis(),
				send: vi.fn().mockReturnThis(),
			};

			vi.spyOn(console, "error").mockImplementation(() => {});
		});

		test("throw error if secret is not a valid JSON", async () => {
			process.env.GITHUB_BOT_CONFIG = "invalid-json";

			octoThink(mockReq, mockRes);

			expect((console.error as Mock).mock.calls[0][0]).toContain(
				"provide a valid JSON string",
			);
			expect(mockRes.status).toHaveBeenCalledWith(500);
			expect(mockRes.send).toHaveBeenCalledWith("Internal Server Error");
		});

		test("throw error if required secret values are missing", async () => {
			process.env.GITHUB_BOT_CONFIG = JSON.stringify({
				APP_ID: "123",
				// Missing PRIVATE_KEY and WEBHOOK_SECRET
			});

			octoThink(mockReq, mockRes);

			expect((console.error as Mock).mock.calls[0][0]).toContain("Invalid key");
			expect(mockRes.status).toHaveBeenCalledWith(500);
			expect(mockRes.send).toHaveBeenCalledWith("Internal Server Error");
		});
	});
});
