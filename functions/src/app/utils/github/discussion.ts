import type { Context } from "probot";

/**
 * Discussionのコメントを含む全文を取得する。
 */
export async function getDiscussionWithComments(
	octokit: Context["octokit"],
	discussionId: string,
): Promise<string> {
	try {
		const query = `
      query GetDiscussionWithComments($id: ID!) {
        node(id: $id) {
          ... on Discussion {
            body
            comments(first: 100) {
              nodes {
                body
              }
            }
          }
        }
      }
    `;

		const response = await octokit.graphql<{
			node: { body: string; comments: { nodes: { body: string }[] } };
		}>(query, {
			id: discussionId,
		});

		const discussionBody = response.node.body;
		const comments = response.node.comments.nodes
			.map((comment) => comment.body)
			.join("\n\n");

		return `${discussionBody}\n\n${comments}`;
	} catch (error) {
		console.error("Error fetching discussion with comments:", error);
		throw new Error("Failed to fetch discussion with comments.");
	}
}

type ReactionContent =
	| "THUMBS_UP"
	| "THUMBS_DOWN"
	| "LAUGH"
	| "HOORAY"
	| "CONFUSED"
	| "HEART"
	| "ROCKET"
	| "EYES";

/**
 * Add a reaction to a discussion or comment.
 */
export async function addReaction(
	octokit: Context["octokit"],
	{
		subjectId,
		content = "ROCKET",
	}: { subjectId: string; content?: ReactionContent },
) {
	try {
		const mutation = `
      mutation AddReaction($subjectId: ID!, $content: ReactionContent!) {
        addReaction(input: { subjectId: $subjectId, content: $content }) {
          reaction {
            content
          }
        }
      }
    `;

		const response = await octokit.graphql<{
			addReaction: { reaction: { content: string } };
		}>(mutation, {
			subjectId,
			content,
		});

		console.log(`Reaction added: ${response.addReaction.reaction.content}`);
		return response;
	} catch (error) {
		console.error("Error adding reaction:", error);
		throw new Error("Failed to add reaction.");
	}
}

/**
 * Create a comment on a discussion.
 */
export async function createDiscussionComment(
	octokit: Context["octokit"],
	discussionId: string,
	content: string,
) {
	if (!discussionId || !content) {
		throw new Error(
			"Discussion ID and content are required to create a discussion comment.",
		);
	}

	try {
		const mutation = `
      mutation CreateDiscussionComment($discussionId: ID!, $body: String!) {
        addDiscussionComment(input: { discussionId: $discussionId, body: $body }) {
          comment {
            id
            body
          }
        }
      }
    `;

		const response = await octokit.graphql<{
			addDiscussionComment: { comment: { id: string; body: string } };
		}>(mutation, {
			discussionId,
			body: content,
		});

		console.log(
			`Comment created with ID: ${response.addDiscussionComment.comment.id}`,
		);
		return response;
	} catch (error) {
		console.error("Error creating discussion comment:", error);
		throw new Error("Failed to create discussion comment.");
	}
}

export async function deleteDiscussionComment(
	octokit: Context["octokit"],
	commentId: string,
) {
	if (!commentId) {
		throw new Error("Comment ID is required to delete a discussion comment.");
	}

	try {
		const mutation = `
      mutation DeleteDiscussionComment($id: ID!) {
        deleteDiscussionComment(input: { id: $id }) {
          clientMutationId
          comment {
            id
            body
          }
        }
      }
    `;

		const response = await octokit.graphql<{
			deleteDiscussionComment: { comment: { id: string; body: string } | null };
		}>(mutation, {
			id: commentId,
		});

		if (response?.deleteDiscussionComment?.comment) {
			console.log(
				`Successfully deleted comment with ID: ${response.deleteDiscussionComment.comment.id}`,
			);
		} else {
			console.log("No comment found or already deleted.");
		}

		return response;
	} catch (error) {
		console.error("Error deleting discussion comment:", error);
		throw new Error("Failed to delete discussion comment.");
	}
}
