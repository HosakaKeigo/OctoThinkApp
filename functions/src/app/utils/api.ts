import { auth } from "google-auth-library";
import { requireEnv } from "./env";
import type {
	CompletionRequestData,
	MultiCompletionRequestData,
} from "../../types/api";

interface RequestBackendOptions {
	method: "POST";
	/**
	 * ex) /multi/completion
	 */
	endpoint: "/multi/completion" | "/openai/completion" | "/gemini/completion";
	data: CompletionRequestData | MultiCompletionRequestData;
}

/**
 * Request to LLM Backend
 *
 * Using Cloud Run which requires authentication. For Firebase Functions, the default service account with run.invoker role can be used.
 *
 * @see:
 * https://cloud.google.com/run/docs/authenticating/service-to-service?hl=ja#use_the_authentication_libraries
 */
export async function requestBackend<T>({
	method,
	endpoint,
	data,
}: RequestBackendOptions): Promise<T> {
	const backendUrl = requireEnv("BACKEND_URL");
	const client = await auth.getIdTokenClient(backendUrl);
	const url = new URL(endpoint, backendUrl).toString();

	try {
		const res = await client.request({
			url,
			method,
			headers: {
				"Content-Type": "application/json",
			},
			data,
		});
		return res.data as T;
	} catch (e) {
		console.error(e);
		throw new Error(
			`Backend request failed: ${e instanceof Error ? e.message : e}`,
		);
	}
}
