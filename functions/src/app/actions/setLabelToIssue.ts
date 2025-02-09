import type { Context } from "probot";
import type { CompletionResponseData } from "../../types/api";
import { requestBackend } from "../utils/api";
import { fetchLabelsWithDescription } from "../utils/github/labels";
import { getDefaultProvider } from "../utils/settings";
import { PROMPTS } from "../prompts";

/**
 * Set proper label to the issue using LLM.
 */
export async function setLabelToIssue(
	context: Context<"issues.opened" | "issues.closed">,
	args?: string,
) {
	if (!context.payload.issue.title && !context.payload.issue.body) {
		console.log("Issue body not found");
		return;
	}
	const labels = (await fetchLabelsWithDescription(context)).map((label) => {
		return {
			name: label.name,
			description: label.description,
		};
	});
	if (labels.length === 0) {
		console.log("No labels found");
		return;
	}

	const response = await requestBackend<CompletionResponseData>({
		method: "POST",
		endpoint: `/${getDefaultProvider()}/completion`,
		data: {
			systemPrompt: PROMPTS.ADD_LABELS(
				labels
					.map(
						(label) =>
							`[name] ${label.name}, [description] ${label.description}`,
					)
					.join("\n"),
			),
			userPrompts: [
				args
					? `以下の内容からラベルを選択してください。${args}\n\nTitle: ${context.payload.issue.title}\nBody: ${context.payload.issue.body}`
					: `Title: ${context.payload.issue.title}\nBody: ${context.payload.issue.body}`,
			],
			responseSchema: {
				type: "object",
				properties: {
					labels: {
						type: "array",
						items: {
							type: "string",
						},
						description: "Label names to be added to the issue",
					},
				},
				required: ["labels"],
			},
		},
	});

	const labelNames = JSON.parse(response.completion).labels;
	if (labelNames.length === 0) {
		console.log("No labels selected");
		return;
	}
	await context.octokit.issues.addLabels({
		owner: context.payload.repository.owner.login,
		repo: context.payload.repository.name,
		issue_number: context.payload.issue.number,
		labels: labelNames,
	});
	return;
}
