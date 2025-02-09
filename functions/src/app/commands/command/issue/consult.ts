import type { Context } from "probot";
import { getIssueWithComments } from "../../../utils/github/issue";
import { requestBackend } from "../../../utils/api";
import type {
	MultiCompletionRequestData,
	MultiCompletionResponseData,
} from "../../../../types/api";
import { PROMPTS } from "../../../prompts";
import { formatAsAccordion } from "../../../utils/github/comments";
import { getReadme } from "../../../utils/github/contents";
import { cleanMarkdownResponse } from "../../../utils/formatter";

/**
 * 複数のLLMに対してIssueの対応方法を相談する
 */
export async function consultCommandHandler(
	context: Context<"issue_comment.created">,
	args?: string,
) {
	const [issueContent, readme] = await Promise.all([
		getIssueWithComments({ context }),
		getReadme(context),
	]);
	const userPrompts = [
		args
			? `以下のIssueについて、解決案を提示してください。${args}`
			: "以下のIssueについて、解決案を提示してください。",
		issueContent,
	];
	if (readme) {
		userPrompts.push(...["このリポジトリのREADMEは以下です。", readme]);
	}

	const data: MultiCompletionRequestData = {
		systemPrompt: PROMPTS.ASK_ISSUE,
		userPrompts: userPrompts,
		providers: ["openai", "gemini"],
	};
	const response = await requestBackend<MultiCompletionResponseData>({
		endpoint: "/multi/completion",
		method: "POST",
		data,
	});

	for (const { completion, provider } of response.completions) {
		await context.octokit.issues.createComment(
			context.issue({
				body: formatAsAccordion(cleanMarkdownResponse(completion), {
					title: "💡 回答を表示",
					provider,
				}),
			}),
		);
	}
}
