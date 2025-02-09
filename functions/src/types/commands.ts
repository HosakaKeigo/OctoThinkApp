import type { Context } from "probot";

type CommandHandler = (
	context: Context<"issue_comment.created">,
	args?: string,
) => Promise<void>;

const COMMAND_CONTEXTS = ["issue", "pull_request", "discussion"] as const;
export type CommandContext = (typeof COMMAND_CONTEXTS)[number];

/**
 * Trigger the handler with `/<command> <args>`
 */
export interface Command {
	name: string;
	description: string;
	/**
	 * RegExp. Hyphens are not allowed.
	 */
	pattern: RegExp;
	handler: CommandHandler;
	args?: {
		type: string;
		description: string;
		optional?: boolean;
	};
	/**
	 * Available on...
	 */
	types: CommandContext[];
	/**
	 * If set to true, the command will be removed after execution
	 */
	removeCommand: boolean;
	/**
	 * flag to prevent recursive calling by LLM
	 */
	notCallableByLlm?: boolean;
}
