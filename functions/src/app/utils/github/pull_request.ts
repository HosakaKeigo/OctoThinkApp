import type { Context } from "probot";
import type {
	MultiCompletionRequestData,
	MultiCompletionResponseData,
	Provider,
} from "../../../types/api";
import { requestBackend } from "../api";
import { PROMPTS } from "../../prompts";
import { getPullRequestSettings } from "../settings";
import { isCommandComment } from "../../commands";
import { cleanMarkdownResponse } from "../formatter";

interface PullRequestContext {
	title: string;
	description: string;
	comments: string[];
}

interface FileDiff {
	commit_id: string;
	filename: string;
	diff: string;
}

export async function getPullRequestContext(
	context: Context<"issue_comment.created">,
): Promise<PullRequestContext> {
	const { owner, repo, issue_number: number } = context.issue();
	const { data: pr } = await context.octokit.pulls.get({
		owner,
		repo,
		pull_number: number,
	});
	const { data: comments } = await context.octokit.issues.listComments({
		owner,
		repo,
		issue_number: number,
	});

	const relevantComments = comments
		.filter((comment) => !isCommandComment(comment.body))
		.map((comment) => comment.body || "");

	return {
		title: pr.title,
		description: pr.body || "",
		comments: relevantComments,
	};
}

export async function getDiffs(
	context: Context<"issue_comment.created">,
): Promise<FileDiff[]> {
	if (!context.payload.issue.pull_request) {
		throw new Error("Not a pull request");
	}

	const owner = context.payload.repository.owner.login;
	const repo = context.payload.repository.name;

	// Get full PR data to access base and head labels
	const { data: pr } = await context.octokit.pulls.get({
		owner,
		repo,
		pull_number: context.payload.issue.number,
	});

	const { data: comparison } =
		await context.octokit.repos.compareCommitsWithBasehead({
			owner,
			repo,
			basehead: `${pr.base.label}...${pr.head.label}`,
		});
	console.log(`diff file count: ${comparison.files?.length}`);
	if (!comparison.files) {
		console.error("No changed files found in comparison");
		return [];
	}

	const commit_id = comparison.commits[comparison.commits.length - 1].sha; // inline commentのために最新のcommit_idを取得

	const { MAX_FILE_COUNT, MAX_DIFF_LENGTH, EXCLUDED_EXTENSIONS } =
		getPullRequestSettings();
	return (
		comparison.files
			?.filter(
				(file) =>
					!EXCLUDED_EXTENSIONS.some((ext) => file.filename.endsWith(ext)),
			) // Exclude files with excluded extensions
			.slice(0, MAX_FILE_COUNT)
			.filter((file) => file.status === "modified" || file.status === "added") // Only show modified files
			.map((file) => ({
				commit_id,
				filename: file.filename,
				diff:
					file.patch && file.patch.length > MAX_DIFF_LENGTH
						? `${file.patch.substring(0, MAX_DIFF_LENGTH)}... (truncated)` // Truncate if too large
						: file.patch || "",
			})) || []
	);
}

export async function reviewPR(
	prContext: PullRequestContext,
	diffs: FileDiff[],
	additionalContext?: string,
): Promise<{ provider: Provider; review: string }[]> {
	const combinedDiff = diffs
		.map((diff) => `File: ${diff.filename}\n${diff.diff}`)
		.join("\n\n");

	const reviewContext = `### Title:
${prContext.title}
### Description:
 ${prContext.description}
### Comments:
${prContext.comments.join("\n")}

### Diff:
${combinedDiff}

### Additional Context:
${additionalContext}
`.trim();

	const { MAX_REVIEW_SIZE } = getPullRequestSettings();
	// Truncate if too large
	const truncatedContext =
		reviewContext.length > MAX_REVIEW_SIZE
			? `${reviewContext.substring(0, MAX_REVIEW_SIZE)}... (truncated)`
			: reviewContext;

	const requestData: MultiCompletionRequestData = {
		systemPrompt: PROMPTS.REVIEW_PR,
		userPrompts: [truncatedContext],
		providers: ["openai", "gemini"],
	};

	// Get reviews from multiple providers
	const response = await requestBackend<MultiCompletionResponseData>({
		method: "POST",
		endpoint: "/multi/completion",
		data: requestData,
	});

	const reviews = response.completions.map((completion) => ({
		provider: completion.provider,
		review:
			reviewContext.length > MAX_REVIEW_SIZE
				? `${cleanMarkdownResponse(completion.completion)}\n\n> ⚠️ Note: 差分が大きかったため、一部切り捨ててレビューしています。`
				: cleanMarkdownResponse(completion.completion),
	}));

	return reviews;
}

/**
 * ファイルごとにinlineでレビューを行う
 *
 * コメント投稿まで行う。
 */
export async function inlineReviewPR(
	context: Context<"issue_comment.created">,
	prContext: PullRequestContext,
	diffs: FileDiff[],
	additionalContext?: string,
): Promise<void> {
	// for safety, restrict the number of files to review
	const { MAX_FILE_COUNT } = getPullRequestSettings();
	if (diffs.length > MAX_FILE_COUNT) {
		throw new Error(
			`Too many files to review: ${diffs.length}. Maximum is ${MAX_FILE_COUNT}`,
		);
	}

	const pullRequestDescription = `
  Title: ${prContext.title}
  Description: ${prContext.description}
  Comments:
  ${prContext.comments.join("\n")}
  `;

	const fileReviewPromises = diffs.map(async (fileDiff) => {
		try {
			const requestData: MultiCompletionRequestData = {
				systemPrompt: PROMPTS.INLINE_REVIEW({
					pullRequestDescription,
					patch: fileDiff.diff,
					language: "Japanese",
					reviewingFileName: fileDiff.filename,
					changedFileNames: diffs.map((diff) => diff.filename),
				}),
				userPrompts: [
					`${additionalContext ? additionalContext : "このファイルについてレビューしてください。"} Filename: ${fileDiff.filename}`,
				],
				providers: ["openai", "gemini"],
			};

			// Get reviews from multiple providers
			const response = await requestBackend<MultiCompletionResponseData>({
				method: "POST",
				endpoint: "/multi/completion",
				data: requestData,
			});

			/**
			 * 行数指定。行数が取れなかった場合はファイル全体に対するコメントとする
			 */
			const lineOptions = parsePatch(fileDiff.diff)[0]
				? { line: parsePatch(fileDiff.diff)[0] }
				: { subject_type: "file" as const };

			const commentPromises = response.completions
				.filter((completion) => completion?.completion)
				.map(async (completion) => {
					try {
						await context.octokit.pulls.createReviewComment({
							owner: context.payload.repository.owner.login,
							repo: context.payload.repository.name,
							pull_number: context.payload.issue.number,
							commit_id: fileDiff.commit_id,
							path: fileDiff.filename,
							body: cleanMarkdownResponse(completion.completion),
							...lineOptions,
						});
					} catch (commentError) {
						console.error(
							`Failed to post comment for file ${fileDiff.filename}:`,
							commentError,
						);
						// コメント投稿の失敗は他のコメントには影響しないようにする
					}
				});

			await Promise.all(commentPromises);
		} catch (error) {
			console.error(
				`Failed to process review for file ${fileDiff.filename}:`,
				error,
			);
			// ファイル単位でのエラーは他のファイルの処理には影響しないようにする
		}
	});

	await Promise.all(fileReviewPromises);
	return;
}

/**
 * Patchの内容から追加された行の行番号を取得する
 */
export function parsePatch(patch: string): number[] {
	const lines = patch.split("\n");
	const modifiedLines: number[] = [];
	let currentLine = 0;

	// 空のパッチをチェック
	if (!patch.trim()) {
		return [];
	}

	for (const line of lines) {
		// 空行のチェック
		if (!line.trim()) {
			currentLine++;
			continue;
		}

		const hunkHeaderMatch = line.match(/^@@ -\d+(,\d+)? \+(\d+)(,\d+)? @@/);
		if (hunkHeaderMatch) {
			currentLine = Number.parseInt(hunkHeaderMatch[2], 10);
			continue;
		}

		// diff のメタデータ行をスキップ
		if (
			line.startsWith("diff ") ||
			line.startsWith("index ") ||
			line.startsWith("--- ") ||
			line.startsWith("+++ ")
		) {
			continue;
		}

		if (line.startsWith("+")) {
			modifiedLines.push(currentLine);
			currentLine++;
		} else if (!line.startsWith("-")) {
			currentLine++;
		}
	}

	return modifiedLines;
}
