import type { Context } from "probot";
import { getCommands } from "..";
import { createDiscussionComment } from "../../utils/github/discussion";
import type { SubscribedEvents } from "../../../types/event";

/**
 * Show the command list
 */
export async function howToCommandHandler(
	context: Context<SubscribedEvents>,
	_?: string,
): Promise<void> {
	const commandInfo = getCommands().map((c) => {
		const argsDesc = c.args?.description ?? " - ";
		return `| ${c.name} | ${c.description} | ${argsDesc} | ${c.types.join(", ")} |`;
	});

	const body = `## 📖 コマンド一覧

| command | description | arguments | available |
|---|---|---|---|
${commandInfo.join("\n")}

> [!TIP]
> コマンドの後ろに半角スペースを入れ、引数を渡すことでより詳細に指示を与えることができます。
> （例）\`/act このIssueの内容を要約して\``;

	// Note: Issues and Discussions have different API.　Discussions uses GraphQL API.
	if ("issue" in context.payload) {
		await context.octokit.issues.createComment(
			context.issue({
				body,
			}),
		);
		return;
	}

	if ("discussion" in context.payload) {
		await createDiscussionComment(
			context.octokit,
			context.payload.discussion.node_id,
			body,
		);
		return;
	}

	throw new Error("Unknown event type");
}
