import type { Context } from "probot";
import {
	getPullRequestContext,
	getDiffs,
	inlineReviewPR,
} from "../../../utils/github/pull_request";

/**
 * Run inline/per-file review using LLMs.
 *
 * Only each file diff is passed to the LLMs.
 * Run /review first will help provide enough context for the LLMs to understand the PR.
 */
export async function inlineReviewCommandHandler(
	context: Context<"issue_comment.created">,
	arg?: string,
) {
	if (!context.payload.issue.pull_request) {
		console.log("This is not a pull request");
		return;
	}

	try {
		// Get PR context and diffs
		const [prContext, diffs] = await Promise.all([
			getPullRequestContext(context),
			getDiffs(context),
		]);

		await inlineReviewPR(context, prContext, diffs, arg);
		return;
	} catch (error) {
		console.error("Error in reviewCommandHandler:", error);
		await context.octokit.issues.createComment(
			context.issue({
				body: `レビューの実行中にエラーが発生しました: ${error instanceof Error ? error.message : error}`,
			}),
		);
		return;
	}
}
