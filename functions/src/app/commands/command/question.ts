import type { Context } from "probot";
import { getIssueWithComments } from "../../utils/github/issue";
import { requestBackend } from "../../utils/api";
import type {
	CompletionResponseData,
	MultiCompletionRequestData,
} from "../../../types/api";
import { PROMPTS } from "../../prompts";
import { cleanMarkdownResponse } from "../../utils/formatter";
import { getDefaultProvider } from "../../utils/settings";
import { formatAsAccordion } from "../../utils/github/comments";
import { getReadme } from "../../utils/github/contents";

/**
 * Ask a question to the AI
 */
export async function questionCommandHandler(
	context: Context<"issue_comment.created">,
	question?: string,
) {
	if (!question) {
		await context.octokit.issues.createComment(
			context.issue({ body: "コマンドに続けて質問を入力してください。" }),
		);
		return;
	}
	const [issueContent, readme] = await Promise.all([
		getIssueWithComments({ context }),
		getReadme(context),
	]);
	const userPrompts = [
		question,
		`なお、Issue/Pull Requestの内容は以下の通りです。
    ----
    ${issueContent}
    ----`,
	];

	if (readme) {
		userPrompts.push(...["このリポジトリのREADMEは以下です。", readme]);
	}

	const data: MultiCompletionRequestData = {
		systemPrompt: PROMPTS.GENERAL,
		userPrompts: userPrompts,
		providers: ["openai", "gemini"],
	};
	const response = await requestBackend<CompletionResponseData>({
		endpoint: `/${getDefaultProvider()}/completion`,
		method: "POST",
		data,
	});

	const answer = cleanMarkdownResponse(response.completion);
	await context.octokit.issues.createComment(
		context.issue({
			body: formatAsAccordion(answer, {
				title: "💡 回答を表示",
				provider: getDefaultProvider(),
			}),
		}),
	);
}
