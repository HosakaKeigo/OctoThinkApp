import type { Context } from "probot";
import { requestBackend } from "../../utils/api";
import { getDefaultProvider } from "../../utils/settings";
import type { CompletionRequestData } from "../../../types/api";
import { getCommands } from "..";
import { PROMPTS } from "../../prompts";
import type { SubscribedEvents } from "../../../types/event";
import { getCurrentContext } from "../../utils/github/context";

/**
 * Let AI choose command and execute it
 */
export async function ActCommandHandler(
	context: Context<SubscribedEvents>,
	arg?: string,
) {
	if (!arg) {
		await context.octokit.issues.createComment(
			context.issue({
				body: "指示内容がありません。次のように実行してください。`/act <指示内容>`",
			}),
		);
		return;
	}

	const { type, ...repoInfo } = await getCurrentContext(context);

	const repoContext = `Title: ${repoInfo.title}
Body: ${repoInfo.body}`;
	const data: CompletionRequestData = {
		systemPrompt: PROMPTS.ACT({
			type,
			commandList: getCommands(),
			repoInfo: {
				...repoInfo,
				context: repoContext,
			},
		}),
		userPrompts: [arg],
		responseSchema: {
			type: "object",
			properties: {
				command: {
					type: "string",
					description: "実行するコマンド名。",
				},
				args: {
					type: "string",
					description: "コマンドに与える引数",
				},
				reply: {
					type: "string",
					description: "ユーザーへの返信内容",
				},
			},
			required: ["reply"],
		},
	};

	const response = await requestBackend<{ completion: string }>({
		endpoint: `/${getDefaultProvider()}/completion`,
		method: "POST",
		data,
	});

	let parsed: { command: string | null; args?: string; reply: string };
	try {
		parsed = JSON.parse(response.completion);
	} catch {
		await context.octokit.issues.createComment(
			context.issue({ body: "エラーが発生しました。" }),
		);
		return;
	}

	const { command, args: llmInstruction, reply } = parsed;

	if (!command) {
		await replyWithNoCommand(context);
		return;
	}
	const commandToUse = getCommands().find((cmd) => cmd.name === command);
	if (!commandToUse) {
		await replyWithNoCommand(context);
		return;
	}

	// To prevent recursive calling. For example, if the chosen command be "act", it may cause an infinite loop.
	if (commandToUse.notCallableByLlm) {
		await replyWithNoCommand(context);
		return;
	}

	if (reply) {
		await context.octokit.issues.createComment(context.issue({ body: reply }));
	}
	await commandToUse.handler(context, augmentInstruction(arg, llmInstruction));
}

async function replyWithNoCommand(context: Context<SubscribedEvents>) {
	await context.octokit.issues.createComment(
		context.issue({ body: "使用できる適切なコマンドがありませんでした。" }),
	);
	const howtoCmd = getCommands().find((cmd) => cmd.name === "howto");
	if (howtoCmd) await howtoCmd.handler(context);
}

/**
 * Clarify the intervening LLM flow.
 */
function augmentInstruction(userInstruction: string, llmInstruction?: string) {
	return `[注意] 以下はユーザーの指示とそれを受けてAIが生成した追加指示です。

----
### ユーザーの指示
${userInstruction}

### AIの追加指示
${llmInstruction ? llmInstruction : "なし"}
---

なお、ここまでは以下の流れです。

1. ユーザーが指示を出す。
2. AIが指示を受けて使用できるコマンドを解析し、適切なコマンドと引数を生成する。
3. あなたへの指示。

したがって、回答は最初のユーザーに対する返答として作成してください。
`;
}
