import type { CommentOperation } from "../../../types/handlers";
import { getCommands } from "../../commands";
import { handleCommandComment } from "../helper/handleCommandComment";

const issueCommentOperations: CommentOperation<"issue_comment.created"> = {
	addReaction: async (context, commentId) => {
		if (typeof commentId !== "number") {
			throw new Error("Comment ID must be a number");
		}
		await context.octokit.reactions.createForIssueComment(
			context.issue({
				comment_id: commentId,
				content: "rocket",
			}),
		);
	},
	deleteComment: async (context, commentId) => {
		if (typeof commentId !== "number") {
			throw new Error("Comment ID must be a number");
		}
		await context.octokit.issues.deleteComment(
			context.issue({
				comment_id: commentId,
			}),
		);
	},
	getCommentInfo: (context) => ({
		type: "issue" as const,
		body: context.payload.comment.body,
		id: context.payload.comment.id,
		nodeId: context.payload.comment.node_id,
		user: context.payload.comment.user,
	}),
	getCommentType: (context) =>
		context.payload.issue.pull_request ? "pull_request" : "issue",
};

/**
 * Respond to issue comment with command
 */
export const onIssueComment = handleCommandComment<"issue_comment.created">(
	issueCommentOperations,
	getCommands(),
);
