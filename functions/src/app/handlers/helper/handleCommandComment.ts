import type { Context } from "probot";
import type {
	CommentEventType,
	CommentOperation,
} from "../../../types/handlers";
import { getCommands } from "../../commands";
import { isBotUser } from "../../utils/github/user";
import { parseCommand } from "../../commands/helper/parseCommand";

/**
 * parse command from the comment body and if it matches the command pattern, execute the command handler.
 */
export function handleCommandComment<T extends CommentEventType>(
	operations: CommentOperation<T>,
	defaultCommands = getCommands(),
) {
	return async (context: Context<T>, commands = defaultCommands) => {
		const commentInfo = operations.getCommentInfo(context);
		if (isBotUser(commentInfo.user)) {
			return;
		}

		const parsedCommand = parseCommand(commentInfo.body.trim());
		console.log(parsedCommand);
		if (!parsedCommand) return;

		const commentType = operations.getCommentType(context);

		/**
		 * find first command that matches the comment type and the command pattern.
		 *
		 * Assume that the command pattern is unique for each command type.
		 */
		const matchingCommand = commands.find(
			(command) =>
				command.types.includes(commentType) &&
				command.pattern.test(`/${parsedCommand.command}`),
		);
		if (!matchingCommand) return;

		try {
			const commentId =
				commentType === "discussion" ? commentInfo.nodeId : commentInfo.id;

			await operations.addReaction(context, commentId);
			await matchingCommand.handler(context, parsedCommand.args);

			if (matchingCommand.removeCommand) {
				await operations.deleteComment(context, commentId);
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			await context.octokit.issues.createComment(
				context.issue({
					body: `コマンドの実行中にエラーが発生しました: ${errorMessage}`,
				}),
			);
		}
	};
}
