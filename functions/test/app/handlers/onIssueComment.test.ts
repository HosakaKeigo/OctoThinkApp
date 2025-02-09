import { describe, test, expect, vi, beforeEach } from "vitest";
import type { Context } from "probot";
import { onIssueComment } from "../../../src/app/handlers/issue/onIssueComment";
import type { Command } from "../../../src/types/commands";

describe("Issueコメントハンドラー", () => {
	// APIのモック関数
	const createReaction = vi.fn();
	const createComment = vi.fn();
	const deleteComment = vi.fn();

	// テスト用のコマンド
	const testCommand: Command = {
		name: "test",
		description: "テストコマンド",
		pattern: /^\/test/,
		handler: vi.fn().mockResolvedValue(undefined),
		types: ["issue", "pull_request"],
		removeCommand: true,
	};

	const errorCommand: Command = {
		name: "error",
		description: "エラーテストコマンド",
		pattern: /^\/error/,
		handler: vi.fn().mockRejectedValue(new Error("Command error")),
		types: ["issue", "pull_request"],
		removeCommand: true,
	};

	const issueOnlyCommand: Command = {
		name: "issueOnly",
		description: "Issue専用コマンド",
		pattern: /^\/issueOnly/,
		handler: vi.fn().mockResolvedValue(undefined),
		types: ["issue"],
		removeCommand: true,
	};

	const noRemoveCommand: Command = {
		name: "noRemove",
		description: "削除しないコマンド",
		pattern: /^\/noRemove/,
		handler: vi.fn().mockResolvedValue(undefined),
		types: ["issue", "pull_request"],
		removeCommand: false,
	};

	// ベースとなるモックコンテキスト
	const createMockContext = (
		commentBody: string,
		userType = "User",
		userLogin = "test-user",
		isPullRequest = false,
	) =>
		({
			payload: {
				comment: {
					id: 123,
					body: commentBody,
					user: {
						type: userType,
						login: userLogin,
					},
				},
				issue: {
					number: 1,
					pull_request: isPullRequest ? {} : undefined,
				},
			},
			issue: (params = {}) => ({
				owner: "owner",
				repo: "repo",
				number: 1,
				...params,
			}),
			octokit: {
				reactions: {
					createForIssueComment: createReaction,
				},
				issues: {
					createComment,
					deleteComment,
				},
			},
		}) as unknown as Context<"issue_comment.created">;

	beforeEach(() => {
		createReaction.mockReset();
		createComment.mockReset();
		deleteComment.mockReset();
	});

	test("botのコメントは無視される", async () => {
		const context = createMockContext("/test", "Bot");
		await onIssueComment(context, [testCommand]);

		expect(createReaction).not.toHaveBeenCalled();
		expect(deleteComment).not.toHaveBeenCalled();
	});

	test("[bot]を含むユーザーのコメントは無視される", async () => {
		const context = createMockContext("/test", "User", "test-user[bot]");
		await onIssueComment(context, [testCommand]);

		expect(createReaction).not.toHaveBeenCalled();
		expect(deleteComment).not.toHaveBeenCalled();
	});

	test("github-actionsを含むユーザーのコメントは無視される", async () => {
		const context = createMockContext("/test", "User", "github-actions");
		await onIssueComment(context, [testCommand]);

		expect(createReaction).not.toHaveBeenCalled();
		expect(deleteComment).not.toHaveBeenCalled();
	});

	test("コマンドがマッチした場合、リアクションが追加されコメントが削除される", async () => {
		const context = createMockContext("/test command");
		createReaction.mockResolvedValue({});
		deleteComment.mockResolvedValue({});

		await onIssueComment(context, [testCommand]);

		expect(createReaction).toHaveBeenCalledWith(
			expect.objectContaining({
				comment_id: 123,
				content: "rocket",
			}),
		);
		expect(testCommand.handler).toHaveBeenCalledWith(context, "command");
		expect(deleteComment).toHaveBeenCalledWith(
			expect.objectContaining({
				comment_id: 123,
			}),
		);
	});

	test("コマンドがマッチしない場合、コメントは削除されない", async () => {
		const context = createMockContext("通常のコメント");
		await onIssueComment(context, [testCommand]);

		expect(createReaction).not.toHaveBeenCalled();
		expect(deleteComment).not.toHaveBeenCalled();
	});

	test("コマンドハンドラーがエラーを投げた場合、エラーメッセージがコメントされる", async () => {
		const context = createMockContext("/error command");
		createReaction.mockResolvedValue({});
		createComment.mockResolvedValue({});
		deleteComment.mockResolvedValue({});

		await onIssueComment(context, [errorCommand]);

		// リアクションが追加されることを確認
		expect(createReaction).toHaveBeenCalledWith(
			expect.objectContaining({
				comment_id: 123,
				content: "rocket",
			}),
		);

		// エラーメッセージがコメントされることを確認
		expect(createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining(
					"コマンドの実行中にエラーが発生しました: Command error",
				),
			}),
		);

		// エラーの場合はコメントはそのまま
		expect(deleteComment).not.toHaveBeenCalledWith(
			expect.objectContaining({
				comment_id: 123,
			}),
		);
	});

	test("コマンドの実行自体が失敗した場合でもエラーメッセージは投稿される", async () => {
		const context = createMockContext("/error command");
		// リアクション追加が失敗するケース
		createReaction.mockRejectedValue(new Error("Reaction error"));
		createComment.mockResolvedValue({});

		await onIssueComment(context, [errorCommand]);

		// エラーメッセージがコメントされることを確認
		expect(createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("コマンドの実行中にエラーが発生しました"),
			}),
		);

		// コメントは削除されないことを確認
		expect(deleteComment).not.toHaveBeenCalled();
	});

	test("commentBodyがスペースを含む場合も正しく処理される", async () => {
		const context = createMockContext("  /test command  ");
		createReaction.mockResolvedValue({});
		deleteComment.mockResolvedValue({});

		await onIssueComment(context, [testCommand]);

		expect(testCommand.handler).toHaveBeenCalled();
		expect(deleteComment).toHaveBeenCalled();
	});

	test('pull_requestの時、typesが["issue"]の場合はコマンドを実行しない', async () => {
		const context = createMockContext(
			"/issueOnly command",
			"User",
			"test-user",
			true,
		);
		await onIssueComment(context, [issueOnlyCommand]);

		expect(issueOnlyCommand.handler).not.toHaveBeenCalled();
		expect(createReaction).not.toHaveBeenCalled();
		expect(deleteComment).not.toHaveBeenCalled();
	});

	test("removeCommandがfalseの場合、コメントは削除されない", async () => {
		const context = createMockContext("/noRemove command");
		createReaction.mockResolvedValue({});
		deleteComment.mockResolvedValue({});

		await onIssueComment(context, [noRemoveCommand]);

		expect(createReaction).toHaveBeenCalledWith(
			expect.objectContaining({
				comment_id: 123,
				content: "rocket",
			}),
		);
		expect(noRemoveCommand.handler).toHaveBeenCalledWith(context, "command");
		expect(deleteComment).not.toHaveBeenCalled();
	});
});
