import { describe, test, expect, vi, beforeEach } from "vitest";
import { type Context, Probot } from "probot";
import handler from "../../src/app";
import { onIssueOpened } from "../../src/app/handlers/issue/onIssueOpened";
import { onIssueClosed } from "../../src/app/handlers/issue/onIssueClosed";
import { onIssueComment } from "../../src/app/handlers/issue/onIssueComment";
import { validateUser } from "../../src/app/utils/settings";
import { onDiscussionComment } from "../../src/app/handlers/discussion/onDiscussionComment";

vi.mock("../../src/app/handlers/issue/onIssueOpened");
vi.mock("../../src/app/handlers/issue/onIssueClosed");
vi.mock("../../src/app/handlers/issue/onIssueComment");
vi.mock("../../src/app/handlers/discussion/onDiscussionComment");
vi.mock("../../src/app/utils/settings");

describe("GitHub Event Handlers", () => {
	let app: Probot;
	let mockContext: Partial<Context>;

	beforeEach(() => {
		app = new Probot({
			appId: 123,
			privateKey: "test-key",
			secret: "test-secret",
		});

		mockContext = {
			payload: {
				sender: {
					login: "test-user",
					type: "User",
					id: 1,
				},
				installation: {
					id: 2,
				},
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			} as any,
		};

		vi.mocked(validateUser).mockReturnValue(true);
	});

	describe("Bot case", () => {
		test("Ignore GitHub Actions bot", async () => {
			const mockBot = {
				...mockContext,
				payload: {
					...mockContext.payload,
					sender: {
						login: "github-actions",
						type: "Bot",
						id: 1,
					},
				},
			};

			handler(app);
			await app.receive({
				id: "123",
				name: "issues.opened",
				payload: mockBot.payload,
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			} as any);

			expect(onIssueOpened).not.toHaveBeenCalled();
		});

		test("Ignore app action", async () => {
			const mockSelf = {
				...mockContext,
				payload: {
					...mockContext.payload,
					sender: {
						login: "my-app",
						type: "User",
						id: 2, // installation.idと同じ
					},
				},
			};

			handler(app);
			await app.receive({
				id: "123",
				name: "issues.opened",
				payload: mockSelf.payload,
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			} as any);

			expect(onIssueOpened).not.toHaveBeenCalled();
		});

		test("Ignore user with [bot].", async () => {
			const mockBotUser = {
				...mockContext,
				payload: {
					...mockContext.payload,
					sender: {
						login: "test-user[bot]",
						type: "User",
						id: 1,
					},
				},
			};

			handler(app);
			await app.receive({
				id: "123",
				name: "issue_comment.created",
				payload: mockBotUser.payload,
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			} as any);

			expect(onIssueComment).not.toHaveBeenCalled();
		});
	});

	describe("valid user case", () => {
		test("handle issues.opened", async () => {
			handler(app);
			await app.receive({
				id: "123",
				name: "issues.opened",
				payload: mockContext.payload,
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			} as any);

			expect(validateUser).toHaveBeenCalledWith("test-user");
			expect(onIssueOpened).toHaveBeenCalled();
		});

		test("handle issues.closed", async () => {
			handler(app);
			await app.receive({
				id: "123",
				name: "issues.closed",
				payload: mockContext.payload,
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			} as any);

			expect(validateUser).toHaveBeenCalledWith("test-user");
			expect(onIssueClosed).toHaveBeenCalled();
		});

		test("handle issue_comment.created", async () => {
			handler(app);
			await app.receive({
				id: "123",
				name: "issue_comment.created",
				payload: mockContext.payload,
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			} as any);

			expect(validateUser).toHaveBeenCalledWith("test-user");
			expect(onIssueComment).toHaveBeenCalled();
		});

		test("handle discussion_comment.created", async () => {
			handler(app);
			await app.receive({
				id: "123",
				name: "discussion_comment.created",
				payload: mockContext.payload,
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			} as any);

			expect(validateUser).toHaveBeenCalledWith("test-user");
			expect(onDiscussionComment).toHaveBeenCalled();
		});

		test("ignore unknown event", async () => {
			handler(app);
			await app.receive({
				id: "123",
				name: "unknown.event",
				payload: mockContext.payload,
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			} as any);

			expect(onIssueOpened).not.toHaveBeenCalled();
			expect(onIssueClosed).not.toHaveBeenCalled();
			expect(onIssueComment).not.toHaveBeenCalled();
			expect(onDiscussionComment).not.toHaveBeenCalled();
		});
	});
});
