import { describe, it, vi, expect, beforeEach, afterAll } from "vitest";
import {
	getDiffs,
	inlineReviewPR,
	parsePatch,
} from "../../../../src/app/utils/github/pull_request";
import { requestBackend } from "../../../../src/app/utils/api";
import {
	getPullRequestSettings,
	initSettings,
	resetConfigCache,
} from "../../../../src/app/utils/settings";
// モックの作成
vi.mock("../../../../src/app/utils/api", () => ({
	requestBackend: vi.fn(),
}));

describe("inlineReviewPR", () => {
	const mockContext = {
		payload: {
			repository: {
				owner: {
					login: "testOwner",
				},
				name: "testRepo",
			},
			issue: {
				number: 123,
			},
		},
		octokit: {
			pulls: {
				createReviewComment: vi.fn(),
			},
		},
	};

	const mockPrContext = {
		title: "feat: Add user authentication feature",
		description: "This PR implements user authentication using JWT tokens",
		comments: [
			"Please review the error handling logic",
			"Updated the tests as requested",
		],
	};

	const mockDiffs = [
		{
			commit_id: "abc123def456",
			filename: "src/auth/userAuth.ts",
			diff: `@@ -15,6 +15,12 @@ import { JWT_SECRET } from '../config';
 
 export class UserAuthService {
   private readonly jwtSecret: string;
+  private readonly tokenExpiration: number;
+
+  constructor(
+    jwtSecret: string = JWT_SECRET,
+    tokenExpiration: number = 24 * 60 * 60
+  ) {
+    this.jwtSecret = jwtSecret;
+    this.tokenExpiration = tokenExpiration;
+  }
 
-  async validateUser(email: string, password: string): Promise<boolean> {
+  async validateUser(email: string, password: string): Promise<UserValidationResult> {
     try {
       const user = await this.userRepository.findByEmail(email);
-      return user && await bcrypt.compare(password, user.password);
+      if (!user) {
+        return { success: false, error: 'User not found' };
+      }
+      
+      const isValid = await bcrypt.compare(password, user.password);
+      return {
+        success: isValid,
+        error: isValid ? undefined : 'Invalid password',
+        user: isValid ? user : undefined
+      };
     } catch (error) {
-      console.error('User validation failed:', error);
-      return false;
+      return { success: false, error: 'Validation failed' };
     }
   }`,
		},
		{
			commit_id: "abc123def456",
			filename: "src/auth/types.ts",
			diff: `@@ -5,4 +5,10 @@ export interface User {
   email: string;
   password: string;
   createdAt: Date;
+}
+
+export interface UserValidationResult {
+  success: boolean;
+  error?: string;
+  user?: User;
 }`,
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should successfully process and post reviews for all files", async () => {
		const mockResponse = {
			systemPrompt: "test prompt",
			userPrompts: ["test user prompt"],
			completions: [
				{ completion: "Review 1", provider: "openai" },
				{ completion: "Review 2", provider: "gemini" },
			],
		};

		// モックの実装
		vi.mocked(requestBackend).mockResolvedValue(mockResponse);
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		vi.mocked(mockContext.octokit.pulls.createReviewComment).mockResolvedValue(
			{} as any,
		);

		await inlineReviewPR(
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			mockContext as any,
			mockPrContext,
			mockDiffs,
		);

		// requestBackendが各ファイルに対して呼び出されたことを確認
		expect(requestBackend).toHaveBeenCalledTimes(2);

		// createReviewCommentが各completionに対して呼び出されたことを確認
		expect(mockContext.octokit.pulls.createReviewComment).toHaveBeenCalledTimes(
			4,
		);

		// 適切なパラメータでcreateReviewCommentが呼び出されたことを確認
		expect(mockContext.octokit.pulls.createReviewComment).toHaveBeenCalledWith({
			owner: "testOwner",
			repo: "testRepo",
			pull_number: 123,
			commit_id: "abc123def456",
			path: "src/auth/userAuth.ts",
			body: "Review 1",
			line: expect.any(Number),
		});
	});

	it("should handle empty completions gracefully", async () => {
		const mockResponse = {
			systemPrompt: "test prompt",
			userPrompts: ["test user prompt"],
			completions: [],
		};

		vi.mocked(requestBackend).mockResolvedValue(mockResponse);

		await inlineReviewPR(
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			mockContext as any,
			mockPrContext,
			mockDiffs,
		);

		// requestBackendは呼び出されるが、createReviewCommentは呼び出されないことを確認
		expect(requestBackend).toHaveBeenCalledTimes(2);
		expect(
			mockContext.octokit.pulls.createReviewComment,
		).not.toHaveBeenCalled();
	});

	it("should handle requestBackend failure for a single file", async () => {
		// 1つ目のファイルはエラー、2つ目は成功
		vi.mocked(requestBackend)
			.mockRejectedValueOnce(new Error("API Error"))
			.mockResolvedValueOnce({
				systemPrompt: "test prompt",
				userPrompts: ["test user prompt"],
				completions: [{ completion: "Review", provider: "openai" }],
			});

		await inlineReviewPR(
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			mockContext as any,
			mockPrContext,
			mockDiffs,
		);

		// 2つ目のファイルのレビューは投稿されることを確認
		expect(mockContext.octokit.pulls.createReviewComment).toHaveBeenCalledTimes(
			1,
		);
	});

	it("should throw error when too many files", async () => {
		const manyDiffs = Array(55).fill(mockDiffs[0]); // MAX_FILE_COUNTを超える数

		await expect(
			inlineReviewPR(
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				mockContext as any,
				mockPrContext,
				manyDiffs,
			),
		).rejects.toThrow("Too many files to review");
	});

	it("should handle createReviewComment failure for some completions", async () => {
		const mockResponse = {
			systemPrompt: "test prompt",
			userPrompts: ["test user prompt"],
			completions: [
				{ completion: "Review 1", provider: "openai" },
				{ completion: "Review 2", provider: "gemini" },
			],
		};

		vi.mocked(requestBackend).mockResolvedValue(mockResponse);
		vi.mocked(mockContext.octokit.pulls.createReviewComment)
			.mockRejectedValueOnce(new Error("GitHub API Error"))
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			.mockResolvedValue({} as any);

		await inlineReviewPR(
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			mockContext as any,
			mockPrContext,
			mockDiffs,
		);

		// エラーが発生しても処理は継続されることを確認
		expect(mockContext.octokit.pulls.createReviewComment).toHaveBeenCalledTimes(
			4,
		);
	});
});

describe("parsePatch", () => {
	it("should correctly parse simple additions", () => {
		const patch = `@@ -1,3 +1,4 @@
 class Example {
+  newMethod() {}
   existingMethod() {}
 }`;
		expect(parsePatch(patch)).toEqual([2]);
	});

	it("should handle multiple hunks", () => {
		const patch = `@@ -1,3 +1,4 @@
 class Example {
+  newMethod() {}
   existingMethod() {}
 }
@@ -10,2 +11,3 @@
   anotherMethod() {}
+  oneMoreMethod() {}
 }`;
		expect(parsePatch(patch)).toEqual([2, 12]);
	});

	it("should handle empty patches", () => {
		expect(parsePatch("")).toEqual([]);
	});

	it("should ignore diff metadata", () => {
		const patch = `diff --git a/file.ts b/file.ts
index 1234567..89abcdef 100644
--- a/file.ts
+++ b/file.ts
@@ -1,2 +1,3 @@
 const x = 1;
+const y = 2;
 const z = 3;`;
		expect(parsePatch(patch)).toEqual([2]);
	});
});

describe("getDiffs", () => {
	initSettings();
	const { MAX_FILE_COUNT, MAX_DIFF_LENGTH, EXCLUDED_EXTENSIONS } =
		getPullRequestSettings();

	const mockContext = {
		payload: {
			repository: {
				owner: {
					login: "testOwner",
				},
				name: "testRepo",
			},
			issue: {
				number: 123,
				pull_request: {}, // PR存在フラグ
			},
		},
		octokit: {
			pulls: {
				get: vi.fn(),
			},
			repos: {
				compareCommitsWithBasehead: vi.fn(),
			},
		},
	};

	const mockPrResponse = {
		data: {
			base: {
				label: "main",
			},
			head: {
				label: "feature-branch",
			},
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		resetConfigCache();
	});

	it("should successfully get diffs for modified and added files", async () => {
		const mockComparisonResponse = {
			data: {
				files: [
					{
						filename: "src/component.tsx",
						status: "modified",
						patch: "diff content 1",
					},
					{
						filename: "src/newFile.ts",
						status: "added",
						patch: "diff content 2",
					},
					{
						filename: "src/deleted.ts",
						status: "removed",
						patch: "diff content 3",
					},
					{
						filename: "src/image.png",
						status: "modified",
						patch: "diff content 4",
					},
				],
				commits: [
					{ sha: "abc123" },
					{ sha: "def456" }, // 最新のコミット
				],
			},
		};

		vi.mocked(mockContext.octokit.pulls.get).mockResolvedValue(mockPrResponse);
		vi.mocked(
			mockContext.octokit.repos.compareCommitsWithBasehead,
		).mockResolvedValue(mockComparisonResponse);

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const result = await getDiffs(mockContext as any);

		expect(mockContext.octokit.pulls.get).toHaveBeenCalledWith({
			owner: "testOwner",
			repo: "testRepo",
			pull_number: 123,
		});

		expect(
			mockContext.octokit.repos.compareCommitsWithBasehead,
		).toHaveBeenCalledWith({
			owner: "testOwner",
			repo: "testRepo",
			basehead: "main...feature-branch",
		});

		expect(result).toHaveLength(2); // 画像ファイルと削除されたファイルは除外される
		expect(result[0]).toEqual({
			commit_id: "def456",
			filename: "src/component.tsx",
			diff: "diff content 1",
		});
		expect(result[1]).toEqual({
			commit_id: "def456",
			filename: "src/newFile.ts",
			diff: "diff content 2",
		});
	});

	it("should truncate long diffs", async () => {
		const longDiff = "a".repeat(MAX_DIFF_LENGTH + 100);
		const mockComparisonResponse = {
			data: {
				files: [
					{
						filename: "src/long.ts",
						status: "modified",
						patch: longDiff,
					},
				],
				commits: [{ sha: "def456" }],
			},
		};

		vi.mocked(mockContext.octokit.pulls.get).mockResolvedValue(mockPrResponse);
		vi.mocked(
			mockContext.octokit.repos.compareCommitsWithBasehead,
		).mockResolvedValue(mockComparisonResponse);

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const result = await getDiffs(mockContext as any);

		expect(result[0].diff).toBe(
			`${"a".repeat(MAX_DIFF_LENGTH)}... (truncated)`,
		);
	});

	it("should throw error if not a pull request", async () => {
		const mockNonPrContext = {
			...mockContext,
			payload: {
				...mockContext.payload,
				issue: {
					number: 123,
					// pull_request property is missing
				},
			},
		};

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		await expect(getDiffs(mockNonPrContext as any)).rejects.toThrow(
			"Not a pull request",
		);
	});

	it("should handle empty files array", async () => {
		const mockComparisonResponse = {
			data: {
				files: [],
				commits: [{ sha: "def456" }],
			},
		};

		vi.mocked(mockContext.octokit.pulls.get).mockResolvedValue(mockPrResponse);
		vi.mocked(
			mockContext.octokit.repos.compareCommitsWithBasehead,
		).mockResolvedValue(mockComparisonResponse);

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const result = await getDiffs(mockContext as any);
		expect(result).toHaveLength(0);
	});

	it("should respect MAX_FILE_COUNT limit", async () => {
		const manyFiles = Array(MAX_FILE_COUNT + 5).fill({
			filename: "src/file.ts",
			status: "modified",
			patch: "diff content",
		});

		const mockComparisonResponse = {
			data: {
				files: manyFiles,
				commits: [{ sha: "def456" }],
			},
		};

		vi.mocked(mockContext.octokit.pulls.get).mockResolvedValue(mockPrResponse);
		vi.mocked(
			mockContext.octokit.repos.compareCommitsWithBasehead,
		).mockResolvedValue(mockComparisonResponse);

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const result = await getDiffs(mockContext as any);
		expect(result).toHaveLength(MAX_FILE_COUNT);
	});

	it("should filter out files with excluded extensions", async () => {
		const mockComparisonResponse = {
			data: {
				files: [
					{
						filename: "src/code.ts",
						status: "modified",
						patch: "diff 1",
					},
					{
						filename: "assets/image.png",
						status: "modified",
						patch: "diff 2",
					},
					{
						filename: "docs/doc.pdf",
						status: "modified",
						patch: "diff 3",
					},
				],
				commits: [{ sha: "def456" }],
			},
		};

		vi.mocked(mockContext.octokit.pulls.get).mockResolvedValue(mockPrResponse);
		vi.mocked(
			mockContext.octokit.repos.compareCommitsWithBasehead,
		).mockResolvedValue(mockComparisonResponse);

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const result = await getDiffs(mockContext as any);
		expect(result).toHaveLength(1);
		expect(result[0].filename).toBe("src/code.ts");
	});

	it("should handle API errors gracefully", async () => {
		vi.mocked(mockContext.octokit.pulls.get).mockRejectedValue(
			new Error("API Error"),
		);

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		await expect(getDiffs(mockContext as any)).rejects.toThrow("API Error");
	});

	it("should handle missing patch property", async () => {
		const mockComparisonResponse = {
			data: {
				files: [
					{
						filename: "src/file.ts",
						status: "modified",
						// patch property is missing
					},
				],
				commits: [{ sha: "def456" }],
			},
		};

		vi.mocked(mockContext.octokit.pulls.get).mockResolvedValue(mockPrResponse);
		vi.mocked(
			mockContext.octokit.repos.compareCommitsWithBasehead,
		).mockResolvedValue(mockComparisonResponse);

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const result = await getDiffs(mockContext as any);
		expect(result[0].diff).toBe("");
	});
});
