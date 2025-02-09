export type Provider = "openai" | "gemini";

export interface CompletionResponseData {
	completion: string;
}

export interface CompletionRequestData {
	systemPrompt: string;
	userPrompts: string[];
	/**
	 * OpenAPIのスキーマ
	 */
	responseSchema?: Record<string, unknown>;
}

export type MultiCompletionRequestData = CompletionRequestData & {
	providers: Provider[];
};

export interface MultiCompletionResponseData {
	systemPrompt: string;
	userPrompts: string[];
	completions: {
		completion: string;
		provider: Provider;
	}[];
}
