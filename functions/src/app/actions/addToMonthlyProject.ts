import type { Context } from "probot";
import {
	addIssueToProjectV2,
	getOrganizationProjects,
} from "../utils/github/projects";

/**
 * If monthly project exists, add issue to it
 *
 * For example, if the current month is 2021-09, and there is a project titled "2021-09", add the issue to that project.
 *
 * Only works for organization projects, not user projects.
 */
export async function addToMonthlyProject(context: Context<"issues.opened">) {
	try {
		const orgName = context.payload.organization?.login;
		if (!orgName) {
			return console.log("No organization found for this repository");
		}

		console.log(`Fetching organization projects for ${orgName}`);
		const projects = await getOrganizationProjects(context, orgName);

		if (projects.length === 0) {
			return console.log("No projects found");
		}

		const currentMonth = new Intl.DateTimeFormat("ja-JP", {
			timeZone: "Asia/Tokyo",
			year: "numeric",
			month: "2-digit",
		}).format(new Date());

		const monthlyProject = projects.find((project) =>
			project.title.includes(currentMonth),
		);

		if (monthlyProject) {
			const issueNodeId = context.payload.issue.node_id;

			const addedItem = await addIssueToProjectV2(
				context,
				monthlyProject.id,
				issueNodeId,
			);

			console.log("Added issue to project:", {
				projectId: monthlyProject.id,
				projectTitle: monthlyProject.title,
				issueId: issueNodeId,
				addedItemId: addedItem.id,
			});
		} else {
			console.log(`No project found for month: ${currentMonth}`);
		}
	} catch (error) {
		console.error("Error in handleIssueOpened:", error);
		throw error;
	}
}
