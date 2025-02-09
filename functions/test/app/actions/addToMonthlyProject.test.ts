import { describe, it, expect, vi, beforeEach } from "vitest";
import { addToMonthlyProject } from "../../../src/app/actions";
import {
	getOrganizationProjects,
	addIssueToProjectV2,
} from "../../../src/app/utils/github/projects";

vi.mock("../../../src/app/utils/github/projects");

describe("addToMonthlyProject", () => {
	const mockContext = {
		payload: {
			organization: {
				login: "test-org",
			},
			issue: {
				node_id: "test-issue-id",
			},
		},
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	} as any;

	beforeEach(() => {
		vi.resetAllMocks();
		// Fix date to 2024-01 for consistent testing
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2024-01-15"));
	});

	it("should add issue to monthly project when project exists", async () => {
		const mockProjects = [
			{
				id: "project-id",
				title: "2024/01 Monthly Project",
			},
		];
		const mockAddedItem = { id: "added-item-id" };

		vi.mocked(getOrganizationProjects).mockResolvedValue(mockProjects);
		vi.mocked(addIssueToProjectV2).mockResolvedValue(mockAddedItem);

		await addToMonthlyProject(mockContext);

		expect(getOrganizationProjects).toHaveBeenCalledWith(
			mockContext,
			"test-org",
		);
		expect(addIssueToProjectV2).toHaveBeenCalledWith(
			mockContext,
			"project-id",
			"test-issue-id",
		);
	});

	it("should not add issue when no monthly project exists", async () => {
		const mockProjects = [
			{
				id: "project-id",
				title: "Other Project",
			},
		];

		vi.mocked(getOrganizationProjects).mockResolvedValue(mockProjects);

		await addToMonthlyProject(mockContext);

		expect(getOrganizationProjects).toHaveBeenCalledWith(
			mockContext,
			"test-org",
		);
		expect(addIssueToProjectV2).not.toHaveBeenCalled();
	});

	it("should handle case when no organization is found", async () => {
		const contextWithoutOrg = {
			payload: {
				issue: {
					node_id: "test-issue-id",
				},
			},
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} as any;

		await addToMonthlyProject(contextWithoutOrg);

		expect(getOrganizationProjects).not.toHaveBeenCalled();
		expect(addIssueToProjectV2).not.toHaveBeenCalled();
	});

	it("should handle case when no projects are found", async () => {
		vi.mocked(getOrganizationProjects).mockResolvedValue([]);

		await addToMonthlyProject(mockContext);

		expect(getOrganizationProjects).toHaveBeenCalledWith(
			mockContext,
			"test-org",
		);
		expect(addIssueToProjectV2).not.toHaveBeenCalled();
	});

	it("should throw error when API calls fail", async () => {
		vi.mocked(getOrganizationProjects).mockRejectedValue(
			new Error("API error"),
		);

		await expect(addToMonthlyProject(mockContext)).rejects.toThrow("API error");
	});
});
