import type { EventConfig } from "../../types/event";
import { onDiscussionComment } from "./discussion/onDiscussionComment";
import { onIssueClosed } from "./issue/onIssueClosed";
import { onIssueComment } from "./issue/onIssueComment";
import { onIssueOpened } from "./issue/onIssueOpened";

/**
 * Events to listen to.
 */
export const EventHandlers: EventConfig[] = [
	{
		event: "issues.opened",
		handler: onIssueOpened,
	},
	{
		event: "issues.closed",
		handler: onIssueClosed,
	},
	{
		event: "issue_comment.created",
		handler: onIssueComment,
	},
	{
		event: "discussion_comment.created",
		handler: onDiscussionComment,
	},
] as const;
