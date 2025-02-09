import type { Context } from "probot";
import { getFileSha } from "./issue";
import type { SubscribedEvents } from "../../../types/event";
import { getMaxReadmeSize } from "../settings";

interface CommitContentToRepoParams {
	context: Context<"issues.closed">;
	path: string;
	content: string;
	commitMessage: string;
}

/**
 * リポジトリコンテンツの保存／更新
 */
export async function commitContentToRepo({
	context,
	path,
	content,
	commitMessage,
}: CommitContentToRepoParams) {
	const sha = await getFileSha(context, path);
	return context.octokit.repos.createOrUpdateFileContents({
		owner: context.payload.repository.owner.login,
		repo: context.payload.repository.name,
		path,
		message: commitMessage,
		content: Buffer.from(content).toString("base64"),
		...(sha ? { sha } : {}),
	});
}

/**
 * Get root README.md if exists
 */
export async function getReadme(
	context: Context<SubscribedEvents>,
	maxContextSize = getMaxReadmeSize(),
): Promise<string> {
	if (maxContextSize <= 0) {
		return "";
	}
	const repoName = `${context.payload.repository.owner.login}/${context.payload.repository.name}`;
	try {
		const { data } = await context.octokit.repos.getContent({
			owner: context.payload.repository.owner.login,
			repo: context.payload.repository.name,
			path: "README.md",
		});
		if ("content" in data) {
			const contentStr = Buffer.from(data.content, "base64").toString("utf-8");
			return `# README For ${repoName}

${contentStr.slice(0, maxContextSize)}`;
		}
	} catch (error) {
		return "";
	}
	return "";
}
