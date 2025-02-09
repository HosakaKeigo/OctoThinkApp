import { describe, it, expect, beforeEach } from "vitest";
import {
	requireEnv,
	validateRequiredEnv,
	validateSecret,
} from "../../../src/app/utils/env";

describe("environment variable utilities", () => {
	beforeEach(() => {
		process.env = {};
	});

	describe("requireEnv", () => {
		it("should return the value of an existing environment variable", () => {
			process.env.TEST_VAR = "test-value";
			expect(requireEnv("TEST_VAR")).toBe("test-value");
		});

		it("should throw error when environment variable is undefined", () => {
			expect(() => requireEnv("TEST_VAR")).toThrow(
				"Missing environment variable: TEST_VAR",
			);
		});

		it("should throw error when environment variable is empty string", () => {
			process.env.TEST_VAR = "";
			expect(() => requireEnv("TEST_VAR")).toThrow(
				"Missing environment variable: TEST_VAR",
			);
		});
	});

	describe("validateRequiredEnv", () => {
		it("should validate required environment variables", () => {
			process.env.BACKEND_URL = "http://example.com";
			process.env.GITHUB_BOT_CONFIG = "secret-config";

			expect(validateRequiredEnv(process.env)).toEqual({
				BACKEND_URL: "http://example.com",
				GITHUB_BOT_CONFIG: "secret-config",
			});
		});

		it("should throw error when BACKEND_URL is missing", () => {
			process.env.GITHUB_BOT_CONFIG = "secret-config";

			expect(() => validateRequiredEnv(process.env)).toThrow(
				`Invalid env: Invalid key: Expected "BACKEND_URL" but received undefined`,
			);
		});

		it("should throw error when GITHUB_BOT_CONFIG is missing", () => {
			process.env.BACKEND_URL = "http://example.com";

			expect(() => validateRequiredEnv(process.env)).toThrow(
				'Invalid env: Invalid key: Expected "GITHUB_BOT_CONFIG" but received undefined',
			);
		});
	});

	describe("validateSecret", () => {
		it("should validate valid secret JSON", () => {
			const secret = JSON.stringify({
				APP_ID: "test-app-id",
				WEBHOOK_SECRET: "test-webhook-secret",
				PRIVATE_KEY: "test-private-key",
			});

			expect(validateSecret(secret)).toEqual({
				APP_ID: "test-app-id",
				WEBHOOK_SECRET: "test-webhook-secret",
				PRIVATE_KEY: "test-private-key",
			});
		});

		it("should throw error when secret is undefined", () => {
			expect(() => validateSecret(undefined)).toThrow(
				"Secret is not provided. Check you correctly set up the Secret Manager according to the README.",
			);
		});

		it("should throw error when secret is invalid JSON", () => {
			expect(() => validateSecret("invalid-json")).toThrow(
				"Invalid secret format. Please provide a valid JSON string.",
			);
		});

		it("should throw error when secret is missing required fields", () => {
			const secret = JSON.stringify({
				APP_ID: "test-app-id",
				// Missing WEBHOOK_SECRET and PRIVATE_KEY
			});

			expect(() => validateSecret(secret)).toThrow(
				'Invalid secret format: Invalid key: Expected "WEBHOOK_SECRET" but received undefined, Invalid key: Expected "PRIVATE_KEY" but received undefined',
			);
		});
	});
});
