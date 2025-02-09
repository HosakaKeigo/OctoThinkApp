import type { Context } from "probot";

interface Label {
	id: number;
	name: string;
	description: string | null;
	color: string;
	default: boolean;
	url: string;
}

/**
 * リポジトリの全ラベルを取得する
 * @param context Probot context
 * @returns Promise<Label[]> ラベルの配列
 */
export async function fetchLabelsWithDescription(
	context: Context<"issues.opened" | "issues.closed">,
): Promise<Label[]> {
	try {
		const response = await context.octokit.issues.listLabelsForRepo({
			owner: context.payload.repository.owner.login,
			repo: context.payload.repository.name,
			per_page: 100,
		});

		return response.data.map((label) => ({
			id: label.id,
			name: label.name,
			description: label.description,
			color: label.color,
			default: label.default,
			url: label.url,
		}));
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		throw new Error(`Failed to fetch labels: ${errorMessage}`);
	}
}
