import type { Context } from "probot";
import type {
	CompletionRequestData,
	CompletionResponseData,
} from "../../../types/api.js";
import { PROMPTS } from "../../prompts/index.js";
import { requestBackend } from "../api.js";
import { isCommandComment } from "../../commands/index.js";
import { getDefaultProvider, getDestructiveOperationsSettings } from "../settings.js";
import { commitContentToRepo } from "./contents.js";

/**
 * 新しいIssueを作成する
 */
export async function createIssue(
	issueUrl: string,
	issueContent: string,
	args?: string,
) {
	const payload: CompletionRequestData = {
		systemPrompt: PROMPTS.CREATE_ISSUE,
		userPrompts: [
			args
				? `Issueの内容は次の通りです。${args}`
				: "Issueの内容は次の通りです。",
			issueContent,
			`なお、作成元のIssueのURLを関連Issueとして記載してください。URL: ${issueUrl}`,
		],
		responseSchema: {
			type: "object",
			properties: {
				title: {
					type: "string",
					description: "Issueのタイトル",
				},
				body: {
					type: "string",
					description: "Issueの内容",
				},
			},
			required: ["title", "body"],
		},
	};

	const response = await requestBackend<CompletionResponseData>({
		method: "POST",
		endpoint: `/${getDefaultProvider()}/completion`,
		data: payload,
	});

	return JSON.parse(response.completion) as { title: string; body: string };
}

/**
 * Issueの内容全体を要約する
 */
export async function summarizeIssue(
	issueContent: string,
	args?: string,
): Promise<string> {
	const payload: CompletionRequestData = {
		systemPrompt: PROMPTS.SUMMARIZE_ISSUE,
		userPrompts: [
			args
				? `Issueの内容は次の通りです。${args}`
				: "Issueの内容は次の通りです。",
			issueContent,
		],
		responseSchema: {
			type: "object",
			properties: {
				summary: {
					type: "string",
					description: "Issueの内容の要約",
				},
			},
			required: ["summary"],
		},
	};

	const response = await requestBackend<CompletionResponseData>({
		method: "POST",
		endpoint: `/${getDefaultProvider()}/completion`,
		data: payload,
	});

	const summary = JSON.parse(response.completion).summary;
	return summary;
}

/**
 * コメント付きIssueを取得し、botのメッセージとコマンドコメントは除外する
 */
export async function getIssueWithComments({
	context,
	includeBotMessage = false,
}: {
	context: Context<"issues.closed">;
	includeBotMessage?: boolean;
}): Promise<string> {
	const issueNumber = context.payload.issue.number;
	const repo = context.payload.repository.name;
	const owner = context.payload.repository.owner.login;
	// Issue本体の情報を取得
	const issueTitle = context.payload.issue.title;
	const issueBody = context.payload.issue.body;
	// Issueのコメント一覧を取得
	const commentsResponse = await context.octokit.issues.listComments({
		owner,
		repo,
		issue_number: issueNumber,
	});

	// コメントからbotのコメントを除外し、整形する
	const comments = commentsResponse.data
		.filter((comment) => includeBotMessage || comment.user?.type !== "Bot") // botのコメントを除外または含める
		.filter((comment) => !isCommandComment(comment.body))
		.map((comment) => `Comment by ${comment.user?.login}:\n${comment.body}`)
		.join("\n\n");

	const issueContent = `Title: ${issueTitle}\n\nBody: ${issueBody}\n\nComments:\n${comments}`;

	return issueContent;
}

/**
 * リポジトリに保管するIssue情報
 */
export function issueSummaryArchiveContent(
	context: Context<"issues.closed">,
	summary: string,
) {
	const issue = context.payload.issue;
	return [
		`# ${issue.title}`,
		"",
		summary,
		"",
		"## Metadata",
		`- Issue: #${issue.number}`,
		`- Created: ${issue.created_at}`,
		`- Closed: ${issue.closed_at}`,
	].join("\n");
}

/**
 * Save Issue Summary to Repo as Markdown
 */
export async function saveIssueSummaryToRepo(
	context: Context<"issues.closed">,
	summary: string,
) {
	const { issueClose: config } = getDestructiveOperationsSettings();
	if (!config.allowSaveSummary) {
		console.log("Issue summary saving is disabled");
		return;
	}
	const path = `issue-summary/${context.payload.issue.number}.md`;
	const content = issueSummaryArchiveContent(context, summary);

	if (!content) {
		throw new Error("Content is empty or undefined");
	}

	const response = await commitContentToRepo({
		context,
		path,
		content,
		commitMessage: `Add issue summary for #${context.payload.issue.number}`,
	});
	if (response.status >= 400) {
		throw new Error(
			`Failed to save issue summary to repo with status ${response.status}`,
		);
	}
	return;
}

/**
 * リポジトリ内のファイルのSHAハッシュを取得する
 */
export async function getFileSha(
	context: Context<"issues.closed">,
	path: string,
): Promise<string | undefined> {
	try {
		const { data } = await context.octokit.repos.getContent({
			owner: context.payload.repository.owner.login,
			repo: context.payload.repository.name,
			path,
		});

		if (!Array.isArray(data)) {
			// 配列の場合、ディレクトリ。
			return data.sha;
		}
		return undefined;
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	} catch (error: any) {
		// ファイルが存在しない場合は404が返る（その場合は新規作成なのでshaは不要）
		if (error.status !== 404) throw error;
		return undefined;
	}
}
