import { describe, test, expect, vi, beforeEach } from "vitest";
import type { Context } from "probot";
import { resolveActions } from "../../../../src/app/handlers/helper/resolveActions";
import type { Action } from "../../../../src/types/handlers";

describe("resolveActions", () => {
	// Mock console methods
	let mockConsoleLog = vi.spyOn(console, "log");
	let mockConsoleError = vi.spyOn(console, "error");

	// Mock context
	const mockContext = {} as Context<"issues.opened">;

	beforeEach(() => {
		vi.clearAllMocks();
		mockConsoleLog = vi.spyOn(console, "log");
		mockConsoleError = vi.spyOn(console, "error");
	});

	test("should execute all actions successfully", async () => {
		const actions: Action<"issues.opened">[] = [
			{
				name: "action1",
				action: vi.fn().mockResolvedValue(undefined),
			},
			{
				name: "action2",
				action: vi.fn().mockResolvedValue(undefined),
			},
		];

		const handler = resolveActions("issues.opened", actions);
		await handler(mockContext);

		expect(actions[0].action).toHaveBeenCalledWith(mockContext);
		expect(actions[1].action).toHaveBeenCalledWith(mockContext);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			"Successfully executed action1",
		);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			"Successfully executed action2",
		);
		expect(mockConsoleError).not.toHaveBeenCalled();
	});

	test("should handle failed actions appropriately", async () => {
		const error = new Error("Action failed");
		const actions: Action<"issues.opened">[] = [
			{
				name: "successAction",
				action: vi.fn().mockResolvedValue(undefined),
			},
			{
				name: "failedAction",
				action: vi.fn().mockRejectedValue(error),
			},
		];

		const handler = resolveActions("issues.opened", actions);
		await handler(mockContext);

		expect(mockConsoleLog).toHaveBeenCalledWith(
			"Successfully executed successAction",
		);
		expect(mockConsoleError).toHaveBeenCalledWith(
			"Failed to execute failedAction:",
			error,
		);
	});

	test("should handle unexpected errors", async () => {
		const unexpectedError = new Error("Unexpected error");
		vi.spyOn(Promise, "allSettled").mockRejectedValueOnce(unexpectedError);

		const actions: Action<"issues.opened">[] = [
			{
				name: "action",
				action: vi.fn(),
			},
		];

		const handler = resolveActions("issues.opened", actions);
		await handler(mockContext);

		expect(mockConsoleError).toHaveBeenCalledWith(
			"Unexpected error in issues.opened handler:",
			unexpectedError,
		);
	});

	test("should work with empty actions array", async () => {
		const handler = resolveActions("issues.opened", []);
		await handler(mockContext);

		expect(mockConsoleLog).not.toHaveBeenCalled();
		expect(mockConsoleError).not.toHaveBeenCalled();
	});
});
