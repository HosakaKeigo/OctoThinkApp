import type { Context } from "probot";
import { setLabelToIssue } from "../../actions";

export async function labelCommandHandler(
	context: Context<"issue_comment.created">,
	args?: string,
) {
	await setLabelToIssue(context, args);
}
