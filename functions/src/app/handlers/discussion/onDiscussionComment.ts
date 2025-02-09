import { getCommands } from "../../commands";
import {
	addReaction,
	deleteDiscussionComment,
} from "../../utils/github/discussion";
import { handleCommandComment } from "../helper/handleCommandComment";
import type { CommentOperation } from "../../../types/handlers";

const discussionCommentOperations: CommentOperation<"discussion_comment.created"> =
{
	addReaction: async (context, nodeId) => {
		await addReaction(context.octokit, {
			subjectId: nodeId.toString(),
		});
	},
	deleteComment: async (context, nodeId) => {
		await deleteDiscussionComment(context.octokit, nodeId.toString());
	},
	getCommentInfo: (context) => ({
		body: context.payload.comment.body,
		id: context.payload.comment.id,
		nodeId: context.payload.comment.node_id,
		user: context.payload.comment.user,
	}),
	getCommentType: () => "discussion" as const,
};

/**
 * Respond to discussion comment with command
 */
export const onDiscussionComment =
	handleCommandComment<"discussion_comment.created">(
		discussionCommentOperations,
		getCommands(),
	);
