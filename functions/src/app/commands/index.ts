import { summarizeCommandHandler } from "./command/issue/summarize";
import { consultCommandHandler } from "./command/issue/consult";
import { formatCommandHandler } from "./command/issue/format";
import { labelCommandHandler } from "./command/label";
import { createCommandHandler } from "./command/issue/create";
import { reviewCommandHandler } from "./command/pull_request/review";
import { questionCommandHandler } from "./command/question";
import { discussCommandHandler } from "./command/discussion/discuss";
import { inlineReviewCommandHandler } from "./command/pull_request/inlineReview";
import { howToCommandHandler } from "./command/howto";
import { searchCommandHandler } from "./command/issue/search";
import type { Command } from "../../types/commands";
import { ActCommandHandler } from "./command/act";
import { getEnabledCommands } from "../utils/settings";

/**
 * Available commands for comment.created
 *
 * pattern: Command pattern (RegExp)
 * handler: Command handler. This function will be called when the command is matched.
 * types: Types of the comment that the command can be used. (issue, pull_request, discussion)
 * removeCommand: If true, the command will be removed from the comment.
 *
 * Some commands are reserved for GitHub Slash Commands.
 * @see: https://docs.github.com/ja/issues/tracking-your-work-with-issues/using-issues/about-slash-commands
 */
const AllCommands: Command[] = [
	{
		name: "act",
		description: "AIにコマンドを選択、実行させます。",
		pattern: /^\/act/i,
		types: ["issue", "pull_request", "discussion"],
		handler: ActCommandHandler,
		args: {
			type: "string",
			description: "AIへの追加指示。AIが回答の際に参照します。",
			optional: false,
		},
		removeCommand: false,
		notCallableByLlm: true,
	},
	{
		name: "question",
		description:
			"現在のIssue/Pull Requestに関してAIに一般的な質問/要求をします。",
		pattern: /^\/question/i,
		handler: questionCommandHandler,
		args: {
			type: "string",
			description: "AIへの質問。",
			optional: false,
		},
		types: ["issue", "pull_request"],
		removeCommand: false,
	},
	{
		name: "summarize",
		description: "Issue内容を要約します。",
		pattern: /^\/summarize/i,
		handler: summarizeCommandHandler,
		args: {
			type: "string",
			description: "AIへの追加指示。AIが回答の際に参照します。",
			optional: true,
		},
		types: ["issue"],
		removeCommand: true,
		notCallableByLlm: true,
	},
	{
		name: "consult",
		description:
			"Issueの対応方法を相談します（複数のAIに質問をします。questionよりも詳細な内容を知りたい場合に適しています。）",
		pattern: /^\/consult/i,
		handler: consultCommandHandler,
		types: ["issue"],
		args: {
			type: "string",
			description: "AIへの相談内容。AIが回答の際に参照します。",
			optional: false,
		},
		removeCommand: true,
	},
	{
		name: "format",
		description: "Issueの内容を踏まえて、冒頭のdescriptionを更新します。",
		pattern: /^\/format/i,
		handler: formatCommandHandler,
		args: {
			type: "string",
			description: "AIへの追加指示。AIが回答の際に参照します。",
			optional: true,
		},
		types: ["issue"],
		removeCommand: true,
	},
	{
		name: "label",
		description: "Issueにラベルを付けます",
		pattern: /^\/label/i,
		handler: labelCommandHandler,
		args: {
			type: "string",
			description: "AIへの追加指示。AIが回答の際に参照します",
			optional: true,
		},
		types: ["issue", "pull_request"],
		removeCommand: true,
	},
	{
		name: "create",
		description: "Issueの内容から新しいIssueを作成します",
		pattern: /^\/create/i,
		handler: createCommandHandler,
		args: {
			type: "string",
			description:
				"AIへの追加指示。作成したいIssueのフォーマットや内容を指示してください。",
			optional: false,
		},
		types: ["issue"],
		removeCommand: true,
	},
	{
		name: "review",
		description: "PRの内容をレビューします",
		pattern: /^\/review/i,
		handler: reviewCommandHandler,
		args: {
			type: "string",
			description:
				"AIへの追加指示。PRについての追加情報や、リクエストがある場合に与えてください。",
			optional: true,
		},
		types: ["pull_request"],
		removeCommand: true,
	},
	{
		name: "inlineReview",
		description: "PRの内容をインラインでレビューします",
		pattern: /^\/inlineReview/i,
		args: {
			type: "string",
			description:
				"AIへの追加指示。PRについての追加情報や、リクエストがある場合に与えてください。",
			optional: true,
		},
		types: ["pull_request"],
		handler: inlineReviewCommandHandler,
		removeCommand: true,
	},
	{
		name: "discuss",
		description: "Discussionの内容をもとにAIに質問します",
		pattern: /^\/discuss/i,
		args: {
			type: "string",
			description:
				"AIへの追加指示。Discussionについての追加情報や、リクエストがある場合に与えてください。",
			optional: false,
		},
		types: ["discussion"],
		handler: discussCommandHandler,
		removeCommand: true,
	},
	{
		name: "howto",
		description: "使い方を表示します",
		pattern: /^\/howto/i,
		types: ["issue", "pull_request", "discussion"],
		handler: howToCommandHandler,
		removeCommand: false,
	},
	{
		name: "search",
		description: "関連Issueを検索します",
		pattern: /^\/search/i,
		types: ["issue"],
		handler: searchCommandHandler,
		removeCommand: true,
	},
];

/**
 * Get enabled commands from the settings
 */
export function getCommands(): Command[] {
	const enabledCommands = getEnabledCommands();
	if (!enabledCommands) {
		return [];
	}
	return AllCommands.filter((cmd) => enabledCommands.includes(cmd.name));
}

export const isCommandComment = (commentBody?: string) => {
	if (!commentBody) return false;
	const Commands = getCommands();
	return Commands.some((command) => command.pattern.test(commentBody));
};
