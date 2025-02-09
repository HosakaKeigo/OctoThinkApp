import { describe, test, expect, vi, beforeEach } from "vitest";
import type { Context } from "probot";
import { onIssueOpened } from "../../../src/app/handlers/issue/onIssueOpened";
import { setLabelToIssue, addToMonthlyProject } from "../../../src/app/actions";

vi.mock("../../../src/app/actions");

describe("onIssueOpened", () => {
	// コンソール出力のモック
	const mockConsoleLog = vi.spyOn(console, "log");
	const mockConsoleError = vi.spyOn(console, "error");

	// モックコンテキスト
	const mockContext = {
		issue: {
			owner: "owner",
			repo: "repo",
			number: 1,
		},
	} as unknown as Context<"issues.opened">;

	beforeEach(() => {
		// 各テスト前にモックをリセット
		vi.resetAllMocks();
	});

	test("すべての操作が成功した場合、成功ログを出力", async () => {
		vi.mocked(setLabelToIssue).mockResolvedValue();
		vi.mocked(addToMonthlyProject).mockResolvedValue();

		await onIssueOpened(mockContext);

		// 成功ログが出力されることを確認
		expect(mockConsoleLog).toHaveBeenCalledWith(
			"Successfully executed setLabelToIssue",
		);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			"Successfully executed addToMonthlyProjects",
		);

		// エラーログが出力されないことを確認
		expect(mockConsoleError).not.toHaveBeenCalled();
	});

	test("ラベル設定が失敗した場合でもプロジェクト追加は実行される", async () => {
		// ラベル設定失敗、プロジェクト追加成功のシナリオ
		vi.mocked(setLabelToIssue).mockRejectedValue(new Error("ラベル設定エラー"));
		vi.mocked(addToMonthlyProject).mockResolvedValue();

		await onIssueOpened(mockContext);

		// エラーログと成功ログの両方が出力されることを確認
		expect(mockConsoleError).toHaveBeenCalledWith(
			"Failed to execute setLabelToIssue:",
			expect.any(Error),
		);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			"Successfully executed addToMonthlyProjects",
		);

		// 両方の操作が実行されたことを確認
		expect(setLabelToIssue).toHaveBeenCalledWith(mockContext);
		expect(addToMonthlyProject).toHaveBeenCalledWith(mockContext);
	});

	test("プロジェクト追加が失敗した場合でもラベル設定は実行される", async () => {
		// ラベル設定成功、プロジェクト追加失敗のシナリオ
		vi.mocked(setLabelToIssue).mockResolvedValue();
		vi.mocked(addToMonthlyProject).mockRejectedValue(
			new Error("プロジェクト追加エラー"),
		);

		await onIssueOpened(mockContext);

		// 成功ログとエラーログの両方が出力されることを確認
		expect(mockConsoleLog).toHaveBeenCalledWith(
			"Successfully executed setLabelToIssue",
		);
		expect(mockConsoleError).toHaveBeenCalledWith(
			"Failed to execute addToMonthlyProjects:",
			expect.any(Error),
		);
	});

	test("両方の操作が失敗した場合、両方のエラーログが出力される", async () => {
		// 両方の操作が失敗するシナリオ
		vi.mocked(setLabelToIssue).mockRejectedValue(new Error("ラベル設定エラー"));
		vi.mocked(addToMonthlyProject).mockRejectedValue(
			new Error("プロジェクト追加エラー"),
		);

		await onIssueOpened(mockContext);

		// 両方のエラーログが出力されることを確認
		expect(mockConsoleError).toHaveBeenCalledWith(
			"Failed to execute setLabelToIssue:",
			expect.any(Error),
		);
		expect(mockConsoleError).toHaveBeenCalledWith(
			"Failed to execute addToMonthlyProjects:",
			expect.any(Error),
		);
		// 成功ログは出力されないことを確認
		expect(mockConsoleLog).not.toHaveBeenCalled();
	});

	test("操作配列が空の場合でもエラーは発生しない", async () => {
		await onIssueOpened(mockContext, []);

		// エラーログも成功ログも出力されないことを確認
		expect(mockConsoleError).not.toHaveBeenCalled();
		expect(mockConsoleLog).not.toHaveBeenCalled();
	});

	test("カスタム操作を実行できる", async () => {
		const customOperation = {
			name: "customOperation",
			action: vi.fn().mockResolvedValue(undefined),
		};

		await onIssueOpened(mockContext, [customOperation]);

		// カスタム操作が実行され、成功ログが出力されることを確認
		expect(customOperation.action).toHaveBeenCalledWith(mockContext);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			"Successfully executed customOperation",
		);
		expect(mockConsoleError).not.toHaveBeenCalled();
	});

	test("予期しないエラーが発生した場合、エラーログが出力される", async () => {
		// Promise.allSettled自体が失敗するような状況をシミュレート
		vi.spyOn(Promise, "allSettled").mockRejectedValue(
			new Error("予期しないエラー"),
		);

		await onIssueOpened(mockContext);

		// 予期しないエラーのログが出力されることを確認
		expect(mockConsoleError).toHaveBeenCalledWith(
			"Unexpected error in issues.opened handler:",
			expect.any(Error),
		);
	});
});
