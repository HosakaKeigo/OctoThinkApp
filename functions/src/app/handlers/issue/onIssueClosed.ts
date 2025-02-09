import type { Context } from "probot";
import { resolveActions } from "../helper/resolveActions";
import { createIssueSummary, setLabelToIssue } from "../../actions";

const defaultActions = [
	{
		name: "createIssueSummary",
		action: createIssueSummary,
	},
	{
		name: "setLabelToIssue",
		action: setLabelToIssue,
	},
];

export const onIssueClosed = (
	context: Context<"issues.closed">,
	actions = defaultActions,
) => resolveActions("issues.closed", actions)(context);
