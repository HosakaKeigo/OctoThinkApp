import { describe, it, expect, vi, beforeEach } from "vitest";
import { setLabelToIssue } from "../../../src/app/actions";
import { fetchLabelsWithDescription } from "../../../src/app/utils/github/labels";
import type { Context } from "probot";
import { requestBackend } from "../../../src/app/utils/api";
import { getDefaultProvider } from "../../../src/app/utils/settings";

vi.mock("../../../src/app/utils/api");
vi.mock("../../../src/app/utils/settings");
vi.mock("../../../src/app/utils/github/labels");
vi.mock("../../../src/app/utils/requestBackend");

describe("setLabelToIssue", () => {
	let mockContext: Context<"issues.opened">;

	beforeEach(() => {
		vi.resetAllMocks();
		mockContext = {
			payload: {
				issue: {
					number: 123,
					title: "Test issue",
					body: "Test issue body",
				},
				repository: {
					owner: {
						login: "test-owner",
					},
					name: "test-repo",
				},
			},
			octokit: {
				issues: {
					addLabels: vi.fn(),
				},
			},
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			issue: (params: any) => ({
				owner: "test-owner",
				repo: "test-repo",
				issue_number: 123,
				...params,
			}),
		} as unknown as Context<"issues.opened">;

		vi.mocked(requestBackend).mockResolvedValue({
			completion: JSON.stringify({ labels: ["needs-review"] }),
		});
		vi.mocked(getDefaultProvider).mockReturnValue("openai");
		vi.mocked(fetchLabelsWithDescription).mockResolvedValue([
			{
				name: "needs-review",
				description: "Needs review",
				id: 1,
				color: "",
				default: false,
				url: "",
			},
			{
				name: "bug",
				description: "Bug report",
				id: 2,
				color: "",
				default: false,
				url: "",
			},
		]);
	});

	it("should add a label to the issue when label exists", async () => {
		vi.mocked(mockContext.octokit.issues.addLabels).mockResolvedValueOnce({
			data: {},
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} as any);

		await setLabelToIssue(mockContext, "needs-review");

		expect(fetchLabelsWithDescription).toHaveBeenCalledWith(mockContext);
		expect(mockContext.octokit.issues.addLabels).toHaveBeenCalledWith({
			owner: "test-owner",
			repo: "test-repo",
			issue_number: 123,
			labels: ["needs-review"],
		});
	});

	it.todo("should not add label when label does not exist", async () => {
		await setLabelToIssue(mockContext, "non-existent-label");

		expect(fetchLabelsWithDescription).toHaveBeenCalledWith(mockContext);
		expect(mockContext.octokit.issues.addLabels).not.toHaveBeenCalled();
	});

	it("should handle errors when fetching labels fails", async () => {
		vi.mocked(fetchLabelsWithDescription).mockRejectedValueOnce(
			new Error("API error"),
		);

		await expect(setLabelToIssue(mockContext, "needs-review")).rejects.toThrow(
			"API error",
		);
		expect(mockContext.octokit.issues.addLabels).not.toHaveBeenCalled();
	});

	it("should handle errors when adding labels fails", async () => {
		vi.mocked(mockContext.octokit.issues.addLabels).mockRejectedValueOnce(
			new Error("API error"),
		);

		await expect(setLabelToIssue(mockContext, "needs-review")).rejects.toThrow(
			"API error",
		);
	});
});
