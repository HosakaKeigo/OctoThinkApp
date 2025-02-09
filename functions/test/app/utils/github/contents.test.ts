import { describe, test, expect, vi, beforeEach } from "vitest";
import type { Context } from "probot";
import { getReadme } from "../../../../src/app/utils/github/contents";
import { getMaxReadmeSize } from "../../../../src/app/utils/settings";

const { getContent } = vi.hoisted(() => {
	return {
		getContent: vi.fn(),
	};
});

vi.mock("../../../../src/app/utils/settings");

describe("getReadme", () => {
	const mockContext = {
		payload: {
			repository: {
				owner: {
					login: "testOwner",
				},
				name: "testRepo",
			},
		},
		octokit: {
			repos: {
				getContent,
			},
		},
	} as unknown as Context<"issues.opened">;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getMaxReadmeSize).mockReturnValue(1000);
	});

	test("successfully retrieves README content", async () => {
		const mockContent = "This is a test README";
		const base64Content = Buffer.from(mockContent).toString("base64");

		getContent.mockResolvedValueOnce({
			data: {
				content: base64Content,
			},
		});

		const result = await getReadme(mockContext);

		expect(result).toContain("# README For testOwner/testRepo");
		expect(result).toContain(mockContent);
		expect(getContent).toHaveBeenCalledWith({
			owner: "testOwner",
			repo: "testRepo",
			path: "README.md",
		});
	});

	test("returns truncated content when README exceeds maxContextSize", async () => {
		const longContent = "a".repeat(1000);
		const base64Content = Buffer.from(longContent).toString("base64");

		getContent.mockResolvedValueOnce({
			data: {
				content: base64Content,
			},
		});

		const result = await getReadme(mockContext, 100);

		expect(result.length).toBeLessThan(longContent.length);
		expect(result).toContain("# README For testOwner/testRepo");
		expect(result.split("\n")[2].length).toBe(100);
	});

	test("returns empty string when README does not exist", async () => {
		getContent.mockRejectedValueOnce(new Error("Not found"));

		const result = await getReadme(mockContext);

		expect(result).toBe("");
	});

	test("returns empty string on API error", async () => {
		getContent.mockRejectedValueOnce(new Error("API error"));

		const result = await getReadme(mockContext);

		expect(result).toBe("");
	});

	test("returns empty string when maxContextSize is 0", async () => {
		const result = await getReadme(mockContext, 0);

		expect(result).toBe("");
		expect(getContent).not.toHaveBeenCalled();
	});

	test("returns empty string when content is missing in getContent response", async () => {
		getContent.mockResolvedValueOnce({
			data: {},
		});

		const result = await getReadme(mockContext);

		expect(result).toBe("");
	});

	test("handles README with non-ASCII characters correctly", async () => {
		const mockContent =
			"This is a test.\n## Section 1\nTest content with 日本語";
		const base64Content = Buffer.from(mockContent).toString("base64");

		getContent.mockResolvedValueOnce({
			data: {
				content: base64Content,
			},
		});

		const result = await getReadme(mockContext);

		expect(result).toContain("# README For testOwner/testRepo");
		expect(result).toContain("This is a test.");
		expect(result).toContain("## Section 1");
		expect(result).toContain("Test content with 日本語");
	});
});
