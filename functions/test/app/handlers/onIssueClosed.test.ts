import { describe, test, expect, vi, beforeEach } from "vitest";
import type { Context } from "probot";
import { onIssueClosed } from "../../../src/app/handlers/issue/onIssueClosed";
import { createIssueSummary, setLabelToIssue } from "../../../src/app/actions";

// 外部依存をモック化
vi.mock("../../../src/app/actions");

describe("Issue クローズ時のハンドラー", () => {
	// コンソール出力のモック
	const mockConsoleLog = vi.spyOn(console, "log");
	const mockConsoleError = vi.spyOn(console, "error");

	// モックコンテキスト
	const createComment = vi.fn();
	const mockContext = {
		issue: (params = {}) => ({
			owner: "owner",
			repo: "repo",
			number: 1,
			...params,
		}),
		octokit: {
			issues: {
				createComment,
			},
			repos: {
				createOrUpdateFileContents: vi.fn(),
			},
		},
		payload: {
			sender: {
				login: "test-user",
				type: "User",
				id: 1,
			},
			installation: {
				id: 2,
			},
			issue: {
				number: 1,
				title: "Test Issue",
				body: "Test body",
			},
			repository: {
				name: "test-repo",
				owner: {
					login: "test-owner",
				},
			},
		},
	} as unknown as Context<"issues.closed">;

	beforeEach(() => {
		// 各テスト前にモックをリセット
		vi.resetAllMocks();
		createComment.mockReset();
	});

	describe("onIssueClosed", () => {
		test("Log when all actions successfully", async () => {
			vi.mocked(createIssueSummary).mockResolvedValue();
			vi.mocked(setLabelToIssue).mockResolvedValue();

			await onIssueClosed(mockContext);

			// 成功ログが出力されることを確認
			expect(mockConsoleLog).toHaveBeenCalledWith(
				"Successfully executed createIssueSummary",
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				"Successfully executed setLabelToIssue",
			);
			expect(mockConsoleError).not.toHaveBeenCalled();
		});

		test("Summarize fail, label success", async () => {
			// 要約作成失敗、ラベル設定成功のシナリオ
			const error = new Error("要約作成エラー");
			vi.mocked(createIssueSummary).mockRejectedValue(error);
			vi.mocked(setLabelToIssue).mockResolvedValue();

			await onIssueClosed(mockContext);

			// エラーログと成功ログの両方が出力されることを確認
			expect(mockConsoleError).toHaveBeenCalledWith(
				"Failed to execute createIssueSummary:",
				expect.any(Error),
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				"Successfully executed setLabelToIssue",
			);
		});

		test("Label success, summarize fail", async () => {
			// 要約作成成功、ラベル設定失敗のシナリオ
			vi.mocked(createIssueSummary).mockResolvedValue();
			vi.mocked(setLabelToIssue).mockRejectedValue(
				new Error("ラベル設定エラー"),
			);

			await onIssueClosed(mockContext);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				"Successfully executed createIssueSummary",
			);
			expect(mockConsoleError).toHaveBeenCalledWith(
				"Failed to execute setLabelToIssue:",
				expect.any(Error),
			);
		});

		test("If actions is empty, no error thrown", async () => {
			await onIssueClosed(mockContext, []);

			expect(mockConsoleError).not.toHaveBeenCalled();
			expect(mockConsoleLog).not.toHaveBeenCalled();
		});
	});
});
