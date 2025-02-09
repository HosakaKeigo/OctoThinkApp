import type { Command, CommandContext } from "../../../types/commands";

export interface ActPromptArgs {
	type: CommandContext;
	commandList: Command[];
	repoInfo: {
		owner: string;
		repo: string;
		context: string;
	};
	/**
	 * Maximum length of the context to give to the AI
	 */
	maxContextLength?: number;
}

export const ActPrompt = ({
	type,
	commandList,
	repoInfo,
	maxContextLength = 3000,
}: ActPromptArgs) => {
	/**
	 * AI friendly command list
	 */
	const commandListString = commandList
		.filter((command) => command.name !== "act")
		.filter((command) => !command.notCallableByLlm)
		.filter((command) => command.types.includes(type))
		.map((command) => {
			return `### ${command.name}
- Description: ${command.description}
${command.args
					? `
- Args:
  - Type: ${command.args.type}
  - ${command.args.description}
  - Optional: ${command.args.optional ? "Yes" : "No"}`
					: ""
				}`;
		});

	const truncatedRepoContext =
		repoInfo.context.length > maxContextLength
			? `${repoInfo.context.slice(0, maxContextLength)}...`
			: repoInfo.context;

	return `あなたはGitHub Appのアシスタントです。

## 行うこと
- ユーザーのリクエストに対して、以下のリストから適切なコマンドを選んでください。
- コマンドには引数が必要なもの、オプションで与えられるものがあります。コマンドに応じて引数を与えてください。

## コマンドリスト
----
${commandListString.join("\n\n")}
----

## 出力例
出力は以下のJSON形式で行ってください。

\`\`\`json
{
  "command": string,
  "args"?: string,
  "reply": string
}
\`\`\`

- commandはCommandListのnameをひとつ選んでください。
- argsはコマンドに与える引数です。argsが必要ないコマンドの場合はargsプロパティを省略してください。（nullやundefinedを与えないでください）。
- replyはユーザーへのメッセージです。どのコマンドを選択し、何を行なうか、ユーザーに伝えてください。（例）「howtoコマンドを用いて使用可能なコマンドを表示します。」

もしも適切なコマンドがない場合や、ユーザーが不適切な要求をしてきた場合は、下記を返してください。

\`\`\`json
{
  "reply": "適切なコマンドが見つかりませんでした。"
}
\`\`\`

## 例
User: 「Issueの内容をmarkdownのテーブルに整理して」

あなたの出力:

\`\`\`json
{
  "command": "question",
  "args": "ここまでのIssueの内容をmarkdownのテーブルに整理してください。"
  "reply": "questionコマンドを用いてIssueの内容を整理します。"
}
\`\`\

## 参考情報
現在のリポジトリの情報を与えます。コマンド選択の際の参考にしてください。

### リポジトリ情報
${repoInfo.owner}/${repoInfo.repo}

### Context
ユーザーのリクエストがされた${type}のコンテンツ:

${truncatedRepoContext}

----
`;
};
