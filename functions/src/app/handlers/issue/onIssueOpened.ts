import type { Context } from "probot";
import { resolveActions } from "../helper/resolveActions";
import { setLabelToIssue, addToMonthlyProject } from "../../actions";

const defaultActions = [
	{
		name: "setLabelToIssue",
		action: setLabelToIssue,
	},
	{
		name: "addToMonthlyProjects",
		action: addToMonthlyProject,
	},
];

export const onIssueOpened = (
	context: Context<"issues.opened">,
	actions = defaultActions,
) => resolveActions("issues.opened", actions)(context);
