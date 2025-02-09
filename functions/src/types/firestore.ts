export interface EmbeddingResponse {
	predictions: [
		{
			embeddings: {
				statistics: {
					truncated: boolean;
					token_count: number;
				};
				values: number[];
			};
		},
	];
}

export type EmbeddingTaskType = "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT";
export interface EmbeddingRequest {
	instances: [
		{
			task_type: EmbeddingTaskType;
			title?: string;
			content: string;
		},
	];
}

export interface GitHubIssueRecord {
	number: number;
	title: string;
	body: string;
}

export interface VectorSearchParams {
	query: string;
	org: string;
	repo: string;
	collectionGroup?: string;
}
