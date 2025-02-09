import { describe, test, expect, vi, beforeEach } from "vitest";
import type { Context } from "probot";
import { handleCommandComment } from "../../../../src/app/handlers/helper/handleCommandComment";
import type { CommentOperation } from "../../../../src/types/handlers";
import type { Command, CommandContext } from "../../../../src/types/commands";

const { getCommentInfo, getCommentType, addReaction, deleteComment } =
	vi.hoisted(() => {
		return {
			getCommentInfo: vi.fn().mockReturnValue({
				user: { login: "testUser", type: "User" },
				body: "/command arg1 arg2",
				id: "123",
			}),
			getCommentType: vi.fn().mockReturnValue("issue"),
			addReaction: vi.fn(),
			deleteComment: vi.fn(),
		};
	});

describe("handleCommandComment", () => {
	const mockOperations: CommentOperation<"issue_comment.created"> = {
		getCommentInfo,
		getCommentType,
		addReaction,
		deleteComment,
	};

	const mockContext = {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		issue: (params: any) => ({
			...params,
			owner: "owner",
			repo: "repo",
			issue_number: 1,
		}),
		octokit: {
			issues: {
				createComment: vi.fn(),
			},
		},
	} as unknown as Context<"issue_comment.created">;

	const mockCommandHandler = vi.fn();
	const mockCommands: Command[] = [
		{
			name: "test-command",
			description: "Test command",
			types: ["issue"],
			pattern: /^\/command/,
			handler: mockCommandHandler,
			removeCommand: true,
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("successfully executes command and removes comment", async () => {
		const handler = handleCommandComment(mockOperations);
		await handler(mockContext, mockCommands);

		expect(mockCommandHandler).toHaveBeenCalledWith(mockContext, "arg1 arg2");
		expect(addReaction).toHaveBeenCalledWith(mockContext, "123");
		expect(deleteComment).toHaveBeenCalledWith(mockContext, "123");
	});

	test("ignores bot comments", async () => {
		getCommentInfo.mockReturnValueOnce({
			user: { login: "bot", type: "Bot" },
			body: "/command",
			id: "123",
		});

		const handler = handleCommandComment(mockOperations);
		await handler(mockContext, mockCommands);

		expect(mockCommandHandler).not.toHaveBeenCalled();
		expect(addReaction).not.toHaveBeenCalled();
	});

	test("ignores non-command comments", async () => {
		getCommentInfo.mockReturnValueOnce({
			user: { login: "testUser", type: "User" },
			body: "not a command",
			id: "123",
		});

		const handler = handleCommandComment(mockOperations);
		await handler(mockContext, mockCommands);

		expect(mockCommandHandler).not.toHaveBeenCalled();
		expect(addReaction).not.toHaveBeenCalled();
	});

	test("handles command execution errors", async () => {
		const error = new Error("Command execution failed");
		mockCommandHandler.mockRejectedValueOnce(error);

		const handler = handleCommandComment(mockOperations);
		await handler(mockContext, mockCommands);

		expect(mockContext.octokit.issues.createComment).toHaveBeenCalledWith({
			owner: "owner",
			repo: "repo",
			issue_number: 1,
			body: expect.stringContaining("Command execution failed"),
		});
	});

	test("handles discussion comments correctly", async () => {
		getCommentType.mockReturnValueOnce("discussion");
		getCommentInfo.mockReturnValueOnce({
			user: { login: "testUser", type: "User" },
			body: "/command arg1",
			nodeId: "discussion_123",
		});

		const handler = handleCommandComment(mockOperations);
		await handler(mockContext, [
			{
				...mockCommands[0],
				types: ["discussion"] as CommandContext[],
			},
		]);

		expect(addReaction).toHaveBeenCalledWith(mockContext, "discussion_123");
	});

	test("does not remove comment if removeCommand is false", async () => {
		const commandsWithoutRemove = [
			{
				...mockCommands[0],
				removeCommand: false,
			},
		];

		const handler = handleCommandComment(mockOperations);
		await handler(mockContext, commandsWithoutRemove);

		expect(addReaction).toHaveBeenCalled();
		expect(deleteComment).not.toHaveBeenCalled();
	});

	test("ignores commands that do not match comment type", async () => {
		const commandsWithDifferentType = [
			{
				...mockCommands[0],
				types: ["pull_request"] as CommandContext[],
			},
		];

		const handler = handleCommandComment(mockOperations);
		await handler(mockContext, commandsWithDifferentType);

		expect(mockCommandHandler).not.toHaveBeenCalled();
		expect(addReaction).not.toHaveBeenCalled();
	});
});
