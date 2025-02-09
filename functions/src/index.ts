import type { Request, Response } from "express";
import { createNodeMiddleware, Probot } from "probot";
import handler from "./app/index";
import * as functions from "firebase-functions";
import { validateRequiredEnv, validateSecret } from "./app/utils/env";
import { initSettings } from "./app/utils/settings";

/**
 * Load and validate config.yml.
 *
 * For this to be evaluated during deployment, it must be imported at the top level.
 */
initSettings();

/**
 * Firebase Functions entrypoint
 */
export const octoThink = functions.https.onRequest(
	{
		timeoutSeconds: 120,
		maxInstances: 3,
		/**
		 * Use Secret Manager for Probot configuration.
		 * Create ".secret.local" to emulate the secret locally.
		 *
		 * https://firebase.google.com/docs/emulator-suite/connect_functions?hl=ja
		 */
		secrets: ["GITHUB_BOT_CONFIG"],
	},
	async (req: Request, res: Response) => {
		try {
			const { GITHUB_BOT_CONFIG } = validateRequiredEnv(process.env);
			const secrets = validateSecret(GITHUB_BOT_CONFIG);

			/**
			 * Use NodeMiddleware for firebase-functions
			 * https://probot.github.io/docs/deployment/#google-cloud-functions
			 */
			const middleware = createNodeMiddleware(handler, {
				probot: new Probot({
					appId: secrets.APP_ID,
					privateKey: secrets.PRIVATE_KEY,
					secret: secrets.WEBHOOK_SECRET,
				}),
				webhooksPath: "/",
			});
			middleware(req, res);
		} catch (err) {
			console.error(err instanceof Error ? err.message : err);
			res.status(500).send("Internal Server Error");
		}
	},
);
