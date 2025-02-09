import type { Context, Probot } from "probot";
import { validateUser } from "./utils/settings";
import type { EventHandler, SubscribedEvents } from "../types/event";
import { EventHandlers } from "./handlers";

/**
 * Handle GitHub Webhook events
 *
 * https://probot.github.io/docs/webhooks/
 */
export default function handler(app: Probot) {
	/**
	 * Create event handler with context validation
	 */
	const createEventHandler =
		(handler: EventHandler) => async (context: Context<SubscribedEvents>) =>
			isValidSender(context) ? handler(context) : undefined;

	// Register event handlers
	for (const { event, handler } of EventHandlers) {
		app.on(event, createEventHandler(handler));
	}
}

/**
 * Filter bot actions to prevent infinite loops
 */
function isValidSender(context: Context<SubscribedEvents>) {
	const isBot = (context: Context<SubscribedEvents>): boolean => {
		// GitHub Actionsによるアクション
		if (context.payload.sender.type === "Bot") return true;
		// アプリ自身によるアクション
		if (context.payload.sender.id === context.payload.installation?.id)
			return true;
		// 一般的なbot判定（usernameに'[bot]'が含まれる）
		if (context.payload.sender.login.includes("[bot]")) return true;
		return false;
	};

	const isAllowedUser = (context: Context<SubscribedEvents>): boolean => {
		const user = context.payload.sender.login;
		return validateUser(user);
	};

	return !isBot(context) && isAllowedUser(context);
}
