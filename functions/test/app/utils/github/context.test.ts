import { describe, test, expect, vi, beforeEach } from "vitest";
import type { Context } from "probot";
import { getCurrentContext } from "../../../../src/app/utils/github/context";
import { getDiscussionWithComments } from "../../../../src/app/utils/github/discussion";
import { getPullRequestContext } from "../../../../src/app/utils/github/pull_request";
import { getIssueWithComments } from "../../../../src/app/utils/github/issue";

vi.mock("../../../../src/app/utils/github/discussion");
vi.mock("../../../../src/app/utils/github/pull_request");
vi.mock("../../../../src/app/utils/github/issue");

describe("getCurrentContext", () => {
	const mockBasePayload = {
		repository: {
			owner: {
				login: "testOwner",
			},
			name: "testRepo",
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("correctly handles discussion context", async () => {
		const mockDiscussionPayload = {
			...mockBasePayload,
			discussion: {
				title: "Test Discussion",
				node_id: "D_123",
			},
		};

		const mockContext = {
			payload: mockDiscussionPayload,
			octokit: {},
		} as unknown as Context<"discussion_comment.created">;

		vi.mocked(getDiscussionWithComments).mockResolvedValueOnce(
			"Discussion body with comments",
		);

		const result = await getCurrentContext(mockContext);

		expect(result).toEqual({
			owner: "testOwner",
			repo: "testRepo",
			type: "discussion",
			title: "Test Discussion",
			body: "Discussion body with comments",
		});
		expect(getDiscussionWithComments).toHaveBeenCalledWith({}, "D_123");
	});

	test("correctly handles pull request context", async () => {
		const mockPRPayload = {
			...mockBasePayload,
			issue: {
				title: "Test PR",
				pull_request: {},
			},
		};

		const mockContext = {
			payload: mockPRPayload,
		} as unknown as Context<"issue_comment.created">;

		vi.mocked(getPullRequestContext).mockResolvedValueOnce({
			title: "Test PR",
			description: "PR description",
			comments: ["comment"], // ignored
		});

		const result = await getCurrentContext(mockContext);

		expect(result).toEqual({
			owner: "testOwner",
			repo: "testRepo",
			type: "pull_request",
			title: "Test PR",
			body: "PR description",
		});
		expect(getPullRequestContext).toHaveBeenCalledWith(mockContext);
	});

	test("correctly handles issue context", async () => {
		const mockIssuePayload = {
			...mockBasePayload,
			issue: {
				title: "Test Issue",
			},
		};

		const mockContext = {
			payload: mockIssuePayload,
		} as unknown as Context<"issue_comment.created">;

		vi.mocked(getIssueWithComments).mockResolvedValueOnce(
			"Issue body with comments",
		);

		const result = await getCurrentContext(mockContext);

		expect(result).toEqual({
			owner: "testOwner",
			repo: "testRepo",
			type: "issue",
			title: "Test Issue",
			body: "Issue body with comments",
		});
		expect(getIssueWithComments).toHaveBeenCalledWith({
			context: mockContext,
			includeBotMessage: true,
		});
	});

	test("throws error for unknown context type", async () => {
		const mockUnknownPayload = {
			...mockBasePayload,
			unknown: {},
		};

		const mockContext = {
			payload: mockUnknownPayload,
		} as unknown as Context<"issue_comment.created">;

		await expect(getCurrentContext(mockContext)).rejects.toThrow(
			"Unknown context",
		);
	});

	test("handles errors from helper functions", async () => {
		const mockIssuePayload = {
			...mockBasePayload,
			issue: {
				title: "Test Issue",
			},
		};

		const mockContext = {
			payload: mockIssuePayload,
		} as unknown as Context<"issue_comment.created">;

		vi.mocked(getIssueWithComments).mockRejectedValueOnce(
			new Error("API Error"),
		);

		await expect(getCurrentContext(mockContext)).rejects.toThrow("API Error");
	});
});
