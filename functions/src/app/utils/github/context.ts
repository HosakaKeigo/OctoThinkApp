import type { Context } from "probot";
import type { SubscribedEvents } from "../../../types/event";
import type { CommandContext } from "../../../types/commands";
import { getDiscussionWithComments } from "./discussion";
import { getPullRequestContext } from "./pull_request";
import { getIssueWithComments } from "./issue";

interface GitHubContext {
	owner: string;
	repo: string;
	type: CommandContext;
	title: string;
	body: string;
}

/**
 * Get Context according to the event type
 */
export async function getCurrentContext(
	context: Context<SubscribedEvents>,
): Promise<GitHubContext> {
	const payload = context.payload;
	if ("discussion" in payload) {
		return {
			owner: payload.repository.owner.login,
			repo: payload.repository.name,
			type: "discussion",
			title: payload.discussion.title,
			body: await getDiscussionWithComments(
				context.octokit,
				payload.discussion.node_id,
			),
		};
	}
	if ("issue" in payload) {
		if ("pull_request" in payload.issue) {
			const { title, description } = await getPullRequestContext(context);
			return {
				owner: payload.repository.owner.login,
				repo: payload.repository.name,
				type: "pull_request",
				title: title,
				body: description,
			};
		}
		return {
			owner: payload.repository.owner.login,
			repo: payload.repository.name,
			type: "issue",
			title: payload.issue.title,
			body: await getIssueWithComments({ context, includeBotMessage: true }),
		};
	}
	throw new Error("Unknown context");
}
