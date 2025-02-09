import {
	Firestore,
	FieldValue,
	type VectorQuery,
	type VectorQuerySnapshot,
} from "@google-cloud/firestore";
import { auth } from "google-auth-library";
import type { Context } from "probot";
import type {
	EmbeddingResponse,
	EmbeddingRequest,
	GitHubIssueRecord,
	VectorSearchParams,
	EmbeddingTaskType,
} from "../../../types/firestore";

/**
 * In order to vector search, you need to create a composite index for this collection Group.
 * https://cloud.google.com/blog/products/databases/get-started-with-firestore-vector-similarity-search?hl=en
 */
const COLLECTION_GROUPS = {
	ISSUES: "github-issues",
};

/**
 * Save issue summary to Firestore with embeddings for future semantic search
 *
 * This also saves the embeddings result to the repo as a JSON file.
 */
export async function insertIssueWithEmbeddings(
	context: Context<"issues.closed">,
	summary: string,
	collectionGroup = COLLECTION_GROUPS.ISSUES,
) {
	const embeddings = await createEmbeddings(summary, "RETRIEVAL_DOCUMENT");
	const db = new Firestore();
	const org = context.payload.repository.owner.login;
	const repo = context.payload.repository.name;
	const issueNumber = context.payload.issue.number;

	// Use the issue number as the document ID
	const docRef = db
		.collection(`${org}/${repo}/${collectionGroup}`)
		.doc(issueNumber.toString());

	// upsert with issue number as the document ID
	await docRef.set({
		number: issueNumber,
		title: context.payload.issue.title,
		body: summary,
		embedding_field: FieldValue.vector(embeddings),
		updated_at: FieldValue.serverTimestamp(),
	});

	return;
}

/**
 * Vector search for issues in Firestore
 */
export async function vectorSearch({
	query,
	org,
	repo,
	collectionGroup = COLLECTION_GROUPS.ISSUES,
}: VectorSearchParams) {
	const queryEmbeddings = await createEmbeddings(query, "RETRIEVAL_QUERY");
	const db = new Firestore();
	const coll = db.collection(`${org}/${repo}/${collectionGroup}`);
	const vectorQuery: VectorQuery = coll.findNearest({
		vectorField: "embedding_field", // Must be same as the field name specified in the composite index
		queryVector: queryEmbeddings,
		limit: 5,
		distanceMeasure: "EUCLIDEAN",
		/**
		 * ベクトル間の距離を格納するフィールド名。小さいほど類似度が高い。
		 */
		distanceResultField: "vector_distance",
	});

	const vectorQuerySnapshot: VectorQuerySnapshot = await vectorQuery.get();
	const results = vectorQuerySnapshot.docs.map(
		(doc) =>
			({
				...doc.data(),
				vector_distance: doc.get("vector_distance"),
			}) as GitHubIssueRecord & {
				embedding_field: number[];
				vector_distance: number;
			},
	);
	return results;
}

/**
 * https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api?hl=ja
 */
async function createEmbeddings(
	content: string,
	type: EmbeddingTaskType = "RETRIEVAL_QUERY",
): Promise<number[]> {
	const projectId = process.env.GCLOUD_PROJECT;
	if (!projectId) {
		throw new Error("GCLOUD_PROJECT is not set");
	}
	const location = "us-central1";
	const model = "text-multilingual-embedding-002";
	const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`;

	const client = await auth.getClient();

	const payload: EmbeddingRequest = {
		instances: [
			{
				content: content,
				task_type: type,
			},
		],
	};

	try {
		const res = await client.request<EmbeddingResponse>({
			url: endpoint,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			data: payload,
		});
		return res.data.predictions[0].embeddings.values;
	} catch (e) {
		console.error(e);
		throw new Error(
			`Embedding request failed: ${e instanceof Error ? e.message : e}`,
		);
	}
}
