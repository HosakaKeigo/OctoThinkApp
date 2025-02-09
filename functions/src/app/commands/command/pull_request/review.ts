import type { Context } from "probot";
import {
	getPullRequestContext,
	getDiffs,
	reviewPR,
} from "../../../utils/github/pull_request";
import { formatAsAccordion } from "../../../utils/github/comments";
import { getReadme } from "../../../utils/github/contents";

/**
 * Run review using LLMs.
 *
 * Whole PR diff is passed to the LLMs.
 *
 * Configurations such as MAX_FILE_COUNT can be set in the `setting.ts`.
 */
export async function reviewCommandHandler(
	context: Context<"issue_comment.created">,
	arg?: string,
) {
	if (!context.payload.issue.pull_request) {
		console.log("This is not a pull request");
		return;
	}

	try {
		const [prContext, diffs, readme] = await Promise.all([
			getPullRequestContext(context),
			getDiffs(context),
			getReadme(context),
		]);

		const additionalContext = `${arg}${readme ? `\n\nこのリポジトリのREADMEは以下です。\n${readme}` : ""}`;
		const reviews = await reviewPR(prContext, diffs, additionalContext);

		const commentPromises = reviews.map((review) => {
			const formattedReview = formatAsAccordion(review.review, {
				title: "💡 レビューを表示",
				provider: review.provider,
			});

			return context.octokit.issues.createComment(
				context.issue({
					body: formattedReview,
				}),
			);
		});

		await Promise.all(commentPromises);
	} catch (error) {
		console.error("Error in reviewCommandHandler:", error);
		await context.octokit.issues.createComment(
			context.issue({
				body: `レビューの実行中にエラーが発生しました: ${error instanceof Error ? error.message : error}`,
			}),
		);
	}
}
