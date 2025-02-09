import type { Provider } from "../../types/api";
import YAML from "yaml";
import * as v from "valibot";
import { loadFile } from "./node";

const PullRequestSettingsSchema = v.partial(
	v.object({
		maxFileCount: v.pipe(v.number(), v.minValue(0)),
		maxDiffLength: v.pipe(v.number(), v.minValue(0), v.maxValue(50000)),
		maxReviewSize: v.pipe(v.number(), v.minValue(0), v.maxValue(100000)),
		excludedExtensions: v.array(v.string()),
	}),
);

const defaultProviders: Provider[] = ["openai", "gemini"];
const DestructiveOperationsSchema = v.object({
	issueClose: v.object({
		allowSaveSummary: v.boolean(),
	}),
});

const ConfigSchema = v.partial(
	v.object({
		defaultProvider: v.picklist(defaultProviders),
		allowedUsers: v.array(v.string()),
		maxReadmeSize: v.pipe(v.number(), v.minValue(0)),
		pullRequestSettings: PullRequestSettingsSchema,
		enabledCommands: v.array(v.string()),
		destructiveOperations: DestructiveOperationsSchema,
	}),
	["allowedUsers"],
);

let typedConfig: v.InferInput<typeof ConfigSchema> | null = null;

/**
 * Validate and load settings from config.yml.
 *
 * Initialize in top-level to load only once.
 *
 * This function has side effects. It reads the config file and caches the result.
 *
 * @see:
 * https://cloud.google.com/run/docs/tips/functions-best-practices#use_global_variables_to_reuse_objects_in_future_invocations
 */
export function initSettings(): v.InferInput<typeof ConfigSchema> {
	if (typedConfig) {
		return typedConfig;
	}

	try {
		const configFile = loadFile("config.yml");
		const rawConfig = YAML.parse(configFile);
		typedConfig = v.parse(ConfigSchema, rawConfig);
		console.log("Config loaded successfully");
		return typedConfig;
	} catch (e) {
		console.error(e);
		let message = "Failed to load config";
		if (e instanceof v.ValiError) {
			message = `${message}: ${e.issues.map((issue) => issue.message).join(", ")}`;
		} else if (e instanceof Error && e.message.includes("ENOENT")) {
			message = `${message}: config.yml not found`;
		}
		throw new Error(message);
	}
}

/**
 * Get the loaded config. If the config is not loaded, initialize.
 */
function getConfig(): v.InferInput<typeof ConfigSchema> {
	if (!typedConfig) {
		typedConfig = initSettings();
		return typedConfig;
	}
	return typedConfig;
}

export function validateUser(username: string): boolean {
	const { allowedUsers } = getConfig();
	if (!allowedUsers || allowedUsers.length === 0) {
		return true;
	}
	return allowedUsers.includes(username);
}

export function getDefaultProvider(): Provider {
	return getConfig().defaultProvider;
}

export function getMaxReadmeSize(): number {
	return getConfig().maxReadmeSize;
}

export function getPullRequestSettings() {
	const { pullRequestSettings } = getConfig();
	return {
		MAX_FILE_COUNT: pullRequestSettings.maxFileCount || 10,
		MAX_DIFF_LENGTH: pullRequestSettings.maxDiffLength || 10000,
		MAX_REVIEW_SIZE: pullRequestSettings.maxReviewSize || 50000,
		EXCLUDED_EXTENSIONS: pullRequestSettings.excludedExtensions || [
			".lock",
			".json",
			".svg",
			".png",
			".jpg",
			".jpeg",
			".gif",
			".pdf",
			".ico",
			"lock.yaml",
		],
	};
}

export function getEnabledCommands(): string[] {
	const config = getConfig();
	return config.enabledCommands;
}

/**
 * Reset the config cache. This is useful for testing.
 */
export function resetConfigCache() {
	typedConfig = null;
}

/**
 * Get destructive operations settings.
 * Return default values (all false) if not configured.
 */
export function getDestructiveOperationsSettings() {
	const config = getConfig();
	return config.destructiveOperations
}
