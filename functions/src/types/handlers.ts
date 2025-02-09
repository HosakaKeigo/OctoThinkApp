import type { Context } from "probot";
import type { SubscribedEvents } from "./event";
import type { GitHubUser } from "../app/utils/github/user";

export type ActionEventType = Extract<
	SubscribedEvents,
	"issues.opened" | "issues.closed"
>;

export type Action<T extends ActionEventType> = {
	name: string;
	action: (context: Context<T>) => Promise<void>;
};

export type CommentEventType =
	| "issue_comment.created"
	| "discussion_comment.created";
export type CommentType = "issue" | "pull_request" | "discussion";
export type CommentInfo = {
	id: number;
	body: string;
	nodeId: string;
	user: GitHubUser;
};

/**
 * Abstract interface for comment operations
 */
export type CommentOperation<T extends CommentEventType> = {
	/**
	 * Add reaction to the comment
	 */
	addReaction: (
		context: Context<T>,
		commentId: string | number,
	) => Promise<void>;
	/**
	 * Delete command comment
	 */
	deleteComment: (
		context: Context<T>,
		commentId: string | number,
	) => Promise<void>;
	getCommentInfo: (context: Context<T>) => CommentInfo;
	/**
	 * Get comment type: issue, pull_request, or discussion
	 */
	getCommentType: (context: Context<T>) => CommentType;
};
