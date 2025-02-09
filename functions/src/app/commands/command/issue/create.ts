import type { Context } from "probot";
import { getIssueWithComments, createIssue } from "../../../utils/github/issue";

/**
 * Create a new issue from the content of the original issue and optional instruction(arg).
 */
export async function createCommandHandler(
	context: Context<"issue_comment.created">,
	args?: string,
) {
	const issueContent = await getIssueWithComments({
		context,
		includeBotMessage: true,
	});
	const issueUrl = context.payload.issue.html_url;
	const newIssue = await createIssue(issueUrl, issueContent, args);

	const createdIssue = await context.octokit.issues.create({
		owner: context.payload.repository.owner.login,
		repo: context.payload.repository.name,
		title: newIssue.title,
		body: newIssue.body,
	});

	await context.octokit.issues.createComment({
		owner: context.payload.repository.owner.login,
		repo: context.payload.repository.name,
		issue_number: context.payload.issue.number,
		body: `新しいIssueを作成しました:\n- ${createdIssue.data.html_url}`,
	});
	return;
}
