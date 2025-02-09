import type { Context } from "probot";

interface ProjectV2Node {
	id: string;
	title: string;
}

interface OrganizationProjectsResponse {
	organization: {
		projectsV2: {
			nodes: ProjectV2Node[];
		};
	};
}

interface AddProjectItemResponse {
	addProjectV2ItemById: {
		item: {
			id: string;
		};
	};
}

/**
 * Organization の Projects v2 を取得する
 *
 * User Projectsは未対応
 * https://github.com/orgs/community/discussions/46681#discussioncomment-8774842
 */
export async function getOrganizationProjects(
	context: Context<"issues.opened">,
	orgName: string,
): Promise<ProjectV2Node[]> {
	const query = `
    query($org: String!) {
      organization(login: $org) {
        projectsV2(first: 20) {
          nodes {
            id
            title
          }
        }
      }
    }
  `;

	const result = await context.octokit.graphql<OrganizationProjectsResponse>(
		query,
		{
			org: orgName,
		},
	);

	return result.organization.projectsV2.nodes;
}

/**
 * Issue を Project に追加する
 */
export async function addIssueToProjectV2(
	context: Context<"issues.opened">,
	projectId: string,
	issueId: string,
): Promise<{ id: string }> {
	const mutation = `
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId contentId: $contentId}) {
        item {
          id
        }
      }
    }
  `;

	const result = await context.octokit.graphql<AddProjectItemResponse>(
		mutation,
		{
			projectId: projectId,
			contentId: issueId,
		},
	);

	return result.addProjectV2ItemById.item;
}
