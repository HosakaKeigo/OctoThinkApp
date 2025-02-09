import type { Context } from "probot";
import type {
	MultiCompletionRequestData,
	MultiCompletionResponseData,
} from "../../../../types/api";
import { PROMPTS } from "../../../prompts";
import { requestBackend } from "../../../utils/api";
import { formatAsAccordion } from "../../../utils/github/comments";
import {
	createDiscussionComment,
	getDiscussionWithComments,
} from "../../../utils/github/discussion";
import { getReadme } from "../../../utils/github/contents";

/**
 * Ask for a solution to LLMs.
 */
export async function discussCommandHandler(
	context: Context<"discussion_comment.created">,
	args?: string,
) {
	const [discussionContent, readme] = await Promise.all([
		getDiscussionWithComments(
			context.octokit,
			context.payload.discussion.node_id,
		),
		getReadme(context),
	]);

	const userPrompts = [
		args
			? `以下のDiscussionについて、解決案を提示してください。${args}`
			: "以下のDiscussionについて、解決案を提示してください。",
		discussionContent,
	];

	if (readme) {
		userPrompts.push(...["このリポジトリのREADMEは以下です。", readme]);
	}
	const data: MultiCompletionRequestData = {
		systemPrompt: PROMPTS.ASK_DISCUSSION,
		userPrompts: userPrompts,
		providers: ["openai", "gemini"],
	};

	const response = await requestBackend<MultiCompletionResponseData>({
		endpoint: "/multi/completion",
		method: "POST",
		data,
	});

	for (const { completion, provider } of response.completions) {
		await createDiscussionComment(
			context.octokit,
			context.payload.discussion.node_id,
			formatAsAccordion(completion, {
				title: "💡 回答を表示",
				provider,
			}),
		);
	}
}
