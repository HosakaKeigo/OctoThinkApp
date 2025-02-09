import type { Context } from "probot";
import { vectorSearch } from "../../../utils/firebase/firestore";
import { getIssueWithComments } from "../../../utils/github/issue";

/**
 * Search related issues with firestore vector search
 */
export async function searchCommandHandler(
	context: Context<"issue_comment.created">,
) {
	const issueContent = await getIssueWithComments({
		context,
		includeBotMessage: true,
	});
	const relevantIssues = await vectorSearch({
		query: issueContent,
		org: context.payload.repository.owner.login,
		repo: context.payload.repository.name,
	});

	const commentBody =
		relevantIssues.length === 0
			? "関連するIssueが見つかりませんでした"
			: `# 関連Issue
${relevantIssues
				.filter((issue) => issue.number !== context.payload.issue.number) // filter itself
				.map((issue) => `- #${issue.number} (distance: ${issue.vector_distance})`)
				.join("\n")}`;

	await context.octokit.issues.createComment({
		owner: context.payload.repository.owner.login,
		repo: context.payload.repository.name,
		issue_number: context.payload.issue.number,
		body: commentBody,
	});
	return;
}
