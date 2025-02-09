import * as v from "valibot";

/**
 * Get an environment variable, throwing an error if it is not set.
 */
export function requireEnv(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Missing environment variable: ${key}`);
	}
	return value;
}

export function validateRequiredEnv(env: NodeJS.ProcessEnv) {
	const RequiredEnv = v.object({
		BACKEND_URL: v.string("BACKEND_URL must be set as environment variable."),
		GITHUB_BOT_CONFIG: v.string(
			"GITHUB_BOT_CONFIG must be set as secret in Secret Manager.",
		),
	});
	try {
		const result = v.parse(RequiredEnv, env);
		return result;
	} catch (e) {
		if (e instanceof v.ValiError) {
			const issues = e.issues.map((issue) => issue.message).join(", ");
			throw new Error(`Invalid env: ${issues}`);
		}
		throw e;
	}
}

export function validateSecret(secret: string | undefined) {
	if (!secret) {
		throw new Error(
			"Secret is not provided. Check you correctly set up the Secret Manager according to the README.",
		);
	}
	try {
		const jsonSecret = JSON.parse(secret);
		const SecretSchema = v.object({
			APP_ID: v.string(),
			WEBHOOK_SECRET: v.string(),
			PRIVATE_KEY: v.string(),
		});
		const result = v.parse(SecretSchema, jsonSecret);
		return result;
	} catch (e) {
		if (e instanceof SyntaxError) {
			throw new Error(
				"Invalid secret format. Please provide a valid JSON string.",
			);
		}
		if (e instanceof v.ValiError) {
			const issues = e.issues.map((issue) => issue.message).join(", ");
			throw new Error(`Invalid secret format: ${issues}`);
		}
		throw e;
	}
}
