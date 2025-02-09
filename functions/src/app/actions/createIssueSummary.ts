import type { Context } from "probot";
import {
	getIssueWithComments,
	saveIssueSummaryToRepo,
	summarizeIssue,
} from "../utils/github/issue";
import { insertIssueWithEmbeddings } from "../utils/firebase/firestore";

/**
 * 1. Summarize Issue with LLM
 * 2. Save Issue Summary to Repo
 * 3. Insert Issue with Embeddings to Firestore
 * 4. Create Issue Summary Comment
 */
export async function createIssueSummary(context: Context<"issues.closed">) {
	try {
		const issueContent = await getIssueWithComments({ context });
		const summary = await summarizeIssue(issueContent);

		const results = await Promise.allSettled([
			context.octokit.issues.createComment(context.issue({ body: summary })),
			saveIssueSummaryToRepo(context, summary),
			insertIssueWithEmbeddings(context, summary),
		]);

		results.forEach((result, index) => {
			if (result.status === "rejected") {
				console.error(`Failed operation ${index}:`, result.reason);
			}
		});

		// Throw error only if all operations failed
		if (results.every((result) => result.status === "rejected")) {
			throw new Error("All operations failed");
		}
	} catch (error) {
		console.error("Error in createIssueSummary:", error);
		await context.octokit.issues.createComment(
			context.issue({
				body: `Issueの内容の要約に失敗しました: ${error instanceof Error ? error.message : error}`,
			}),
		);
		throw error;
	}
}
