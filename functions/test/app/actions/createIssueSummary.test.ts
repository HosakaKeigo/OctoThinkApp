import { describe, it, expect, vi, beforeEach } from "vitest";
import { createIssueSummary } from "../../../src/app/actions";
import {
	getIssueWithComments,
	saveIssueSummaryToRepo,
	summarizeIssue,
} from "../../../src/app/utils/github/issue";
import { insertIssueWithEmbeddings } from "../../../src/app/utils/firebase/firestore";

vi.mock("../../../src/app/utils/github/issue");
vi.mock("../../../src/app/utils/firebase/firestore");

describe("createIssueSummary", () => {
	const mockSummary = "Test issue summary";
	const mockContext = {
		payload: {
			issue: {
				number: 1,
				title: "Test Issue",
			},
			repository: {
				name: "test-repo",
				owner: {
					login: "test-org",
				},
			},
		},
		issue: (params: object) => ({
			owner: "test-org",
			repo: "test-repo",
			issue_number: 1,
			...params,
		}),
		octokit: {
			issues: {
				createComment: vi.fn(),
			},
		},
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	} as any;

	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(getIssueWithComments).mockResolvedValue("Test issue content");
		vi.mocked(summarizeIssue).mockResolvedValue(mockSummary);
		vi.mocked(saveIssueSummaryToRepo).mockResolvedValue(undefined);
		vi.mocked(insertIssueWithEmbeddings).mockResolvedValue(undefined);
		mockContext.octokit.issues.createComment.mockResolvedValue({ data: {} });
	});

	it("should create issue summary and perform all operations successfully", async () => {
		await createIssueSummary(mockContext);

		expect(getIssueWithComments).toHaveBeenCalledWith({ context: mockContext });
		expect(summarizeIssue).toHaveBeenCalledWith("Test issue content");
		expect(mockContext.octokit.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: mockSummary,
			}),
		);
		expect(saveIssueSummaryToRepo).toHaveBeenCalledWith(
			mockContext,
			mockSummary,
		);
		expect(insertIssueWithEmbeddings).toHaveBeenCalledWith(
			mockContext,
			mockSummary,
		);
	});

	it("should continue if some operations fail but not all", async () => {
		vi.mocked(saveIssueSummaryToRepo).mockRejectedValue(
			new Error("Save failed"),
		);

		await createIssueSummary(mockContext);

		expect(mockContext.octokit.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: mockSummary,
			}),
		);
		expect(insertIssueWithEmbeddings).toHaveBeenCalled();
	});

	it("should throw error when all operations fail", async () => {
		// First comment attempt (normal summary) fails
		mockContext.octokit.issues.createComment
			.mockRejectedValueOnce(new Error("Comment failed"))
			// Second comment attempt (error message) succeeds
			.mockResolvedValueOnce({ data: {} });

		vi.mocked(saveIssueSummaryToRepo).mockRejectedValue(
			new Error("Save failed"),
		);
		vi.mocked(insertIssueWithEmbeddings).mockRejectedValue(
			new Error("Insert failed"),
		);

		await expect(createIssueSummary(mockContext)).rejects.toThrow(
			"All operations failed",
		);

		expect(mockContext.octokit.issues.createComment).toHaveBeenCalledTimes(2);
		// 最初のコメント（要約）の投稿
		expect(mockContext.octokit.issues.createComment).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				body: mockSummary,
			}),
		);
		// エラーメッセージのコメント投稿
		expect(mockContext.octokit.issues.createComment).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				body: expect.stringContaining("Issueの内容の要約に失敗しました"),
			}),
		);
	});

	it("should create error comment when summarization fails", async () => {
		const error = new Error("Summarization failed");
		vi.mocked(summarizeIssue).mockRejectedValue(error);

		await expect(createIssueSummary(mockContext)).rejects.toThrow(
			"Summarization failed",
		);

		expect(mockContext.octokit.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining(
					"Issueの内容の要約に失敗しました: Summarization failed",
				),
			}),
		);
	});
});
