import type { Context } from "probot";
import type { Action, ActionEventType } from "../../../types/handlers";

/**
 * Resolve given actions for the event type.
 *
 * Actions are resolved in parallel using Promise.allSettled.
 */
export function resolveActions<T extends ActionEventType>(
	eventType: T,
	actions: Action<T>[],
) {
	return async (context: Context<T>) => {
		try {
			const results = await Promise.allSettled(
				actions.map((ac) => ac.action(context)),
			);

			results.forEach((result, index) => {
				const actionName = actions[index].name;
				if (result.status === "rejected") {
					console.error(`Failed to execute ${actionName}:`, result.reason);
				} else {
					console.log(`Successfully executed ${actionName}`);
				}
			});
		} catch (error) {
			console.error(`Unexpected error in ${eventType} handler:`, error);
		}
	};
}
