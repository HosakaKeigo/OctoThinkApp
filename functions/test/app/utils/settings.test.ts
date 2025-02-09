import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import {
	initSettings,
	validateUser,
	getDefaultProvider,
	getMaxReadmeSize,
	getPullRequestSettings,
	resetConfigCache,
} from "../../../src/app/utils/settings";
import YAML from "yaml";
import { loadFile } from "../../../src/app/utils/node";

vi.mock("../../../src/app/utils/node");

describe("settings", () => {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	let mockConfig: any;

	beforeEach(() => {
		mockConfig = {
			defaultProvider: "gemini",
			allowedUsers: ["user1", "user2"],
			maxReadmeSize: 5000,
			pullRequestSettings: {
				maxFileCount: 10,
				maxDiffLength: 10000,
				maxReviewSize: 50000,
				excludedExtensions: [".lock", ".json"],
			},
			enabledCommands: ["act"],
			destructiveOperations: {
				issueClose: {
					allowSaveSummary: false
				}
			}
		};
		vi.mocked(loadFile).mockReturnValue("");

		resetConfigCache();
	});

	describe("initSettings", () => {
		it("should load config successfully", () => {
			vi.spyOn(YAML, "parse").mockReturnValueOnce(mockConfig);
			const config = initSettings();
			expect(config).toEqual(mockConfig);
		});

		describe("invalid config", () => {
			it("should throw error when config file is not found", () => {
				vi.spyOn(fs, "readFileSync").mockImplementation(() => {
					throw new Error("ENOENT: no such file or directory");
				});
				expect(() => initSettings()).toThrow(
					"Failed to load config: config.yml not found",
				);
			});

			it("should throw error when config is invalid yaml", () => {
				vi.spyOn(fs, "readFileSync").mockReturnValue("invalid");
				expect(() => initSettings()).toThrow();
			});

			it("should throw error when provider is invalid", () => {
				mockConfig.defaultProvider = "invalid";
				vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
				vi.spyOn(YAML, "parse").mockReturnValue(mockConfig);

				expect(() => initSettings()).toThrow();
			});

			describe("pullRequestSettings validation", () => {
				it("should throw error when maxFileCount is negative", () => {
					mockConfig.pullRequestSettings.maxFileCount = -1;
					vi.mocked(fs.readFileSync).mockReturnValue(
						JSON.stringify(mockConfig),
					);
					vi.spyOn(YAML, "parse").mockReturnValue(mockConfig);

					expect(() => initSettings()).toThrow();
				});

				it("should throw error when maxDiffLength is negative", () => {
					mockConfig.pullRequestSettings.maxDiffLength = -1;
					vi.mocked(fs.readFileSync).mockReturnValue(
						JSON.stringify(mockConfig),
					);
					vi.spyOn(YAML, "parse").mockReturnValue(mockConfig);

					expect(() => initSettings()).toThrow();
				});

				it("should throw error when maxDiffLength exceeds maximum", () => {
					mockConfig.pullRequestSettings.maxDiffLength = 50001;
					vi.mocked(fs.readFileSync).mockReturnValue(
						JSON.stringify(mockConfig),
					);
					vi.spyOn(YAML, "parse").mockReturnValue(mockConfig);

					expect(() => initSettings()).toThrow();
				});

				it("should throw error when maxReviewSize is negative", () => {
					mockConfig.pullRequestSettings.maxReviewSize = -1;
					vi.mocked(fs.readFileSync).mockReturnValue(
						JSON.stringify(mockConfig),
					);
					vi.spyOn(YAML, "parse").mockReturnValue(mockConfig);

					expect(() => initSettings()).toThrow();
				});

				it("should throw error when maxReviewSize exceeds maximum", () => {
					mockConfig.pullRequestSettings.maxReviewSize = 100001;
					vi.mocked(fs.readFileSync).mockReturnValue(
						JSON.stringify(mockConfig),
					);
					vi.spyOn(YAML, "parse").mockReturnValue(mockConfig);

					expect(() => initSettings()).toThrow();
				});

				it("should throw error when excludedExtensions contains non-string value", () => {
					mockConfig.pullRequestSettings.excludedExtensions = [123];
					vi.mocked(fs.readFileSync).mockReturnValue(
						JSON.stringify(mockConfig),
					);
					vi.spyOn(YAML, "parse").mockReturnValue(mockConfig);

					expect(() => initSettings()).toThrow();
				});
			});

			describe("other settings validation", () => {
				it("should throw error when maxReadmeSize is negative", () => {
					mockConfig.maxReadmeSize = -1;
					vi.mocked(fs.readFileSync).mockReturnValue(
						JSON.stringify(mockConfig),
					);
					vi.spyOn(YAML, "parse").mockReturnValue(mockConfig);

					expect(() => initSettings()).toThrow();
				});

				it("should throw error when allowedUsers contains non-string value", () => {
					mockConfig.allowedUsers = [123];
					vi.spyOn(YAML, "parse").mockReturnValue(mockConfig);
					vi.mocked(fs.readFileSync).mockReturnValue(
						JSON.stringify(mockConfig),
					);
					expect(() => initSettings()).toThrow();
				});
			});
		});
	});

	describe("validateUser", () => {
		it("should return true for allowed user", () => {
			vi.spyOn(YAML, "parse").mockReturnValue(mockConfig);
			initSettings();
			expect(validateUser("user1")).toBe(true);
		});

		it("should return false for not allowed user", () => {
			vi.spyOn(YAML, "parse").mockReturnValue(mockConfig);
			initSettings();
			expect(validateUser("user3")).toBe(false);
		});
	});

	describe("getDefaultProvider", () => {
		it("should return default provider from config", () => {
			initSettings();
			expect(getDefaultProvider()).toBe("gemini");
		});
	});

	describe("getMaxReadmeSize", () => {
		it("should return max readme size from config", () => {
			initSettings();
			expect(getMaxReadmeSize()).toBe(5000);
		});
	});

	describe("getPullRequestSettings", () => {
		it("should return pull request settings from config", () => {
			vi.spyOn(YAML, "parse").mockReturnValue(mockConfig);
			initSettings();
			expect(getPullRequestSettings()).toEqual({
				MAX_FILE_COUNT: 10,
				MAX_DIFF_LENGTH: 10000,
				MAX_REVIEW_SIZE: 50000,
				EXCLUDED_EXTENSIONS: [".lock", ".json"],
			});
		});
	});
});
