import type { Context } from "probot";
import { getIssueWithComments } from "../../../utils/github/issue";
import { requestBackend } from "../../../utils/api";
import type { CompletionResponseData } from "../../../../types/api";
import { PROMPTS } from "../../../prompts";
import { getDefaultProvider } from "../../../utils/settings";

/**
 * Format the issue content with the given instruction(arg).
 */
export async function formatCommandHandler(
	context: Context<"issue_comment.created">,
	args?: string,
) {
	const issueContent = await getIssueWithComments({ context });

	const response = await requestBackend<CompletionResponseData>({
		method: "POST",
		endpoint: `/${getDefaultProvider()}/completion`,
		data: {
			systemPrompt: PROMPTS.FORMAT_ISSUE,
			userPrompts: [
				args
					? `Issueの内容は次の通りです。${args}`
					: "Issueの内容は次の通りです。",
				issueContent,
			],
		},
	});

	const formattedIssue = response.completion;
	if (formattedIssue) {
		await context.octokit.issues.update({
			owner: context.payload.repository.owner.login,
			repo: context.payload.repository.name,
			issue_number: context.payload.issue.number,
			body: formattedIssue,
		});
	}
	return;
}
