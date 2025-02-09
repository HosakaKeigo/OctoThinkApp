import type { Context } from "probot";
import { getIssueWithComments, summarizeIssue } from "../../../utils/github/issue";

export async function summarizeCommandHandler(
	context: Context<"issue_comment.created">,
	args?: string,
) {
	const issueContent = await getIssueWithComments({ context });
	const summary = await summarizeIssue(issueContent, args);

	await context.octokit.issues.createComment({
		owner: context.payload.repository.owner.login,
		repo: context.payload.repository.name,
		issue_number: context.payload.issue.number,
		body: summary,
	});
}
