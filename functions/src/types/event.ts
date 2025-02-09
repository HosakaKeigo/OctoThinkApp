import type { Context } from "probot";

export type SubscribedEvents =
	| "issues.opened"
	| "issues.closed"
	| "issue_comment.created"
	| "discussion_comment.created";

export type EventHandler = (
	context: Context<SubscribedEvents>,
) => Promise<void>;

export type EventConfig = {
	event: SubscribedEvents;
	handler: EventHandler;
};
