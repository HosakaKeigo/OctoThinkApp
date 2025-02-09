import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { howToCommandHandler } from '../../../src/app/commands/command/howto';
import { createDiscussionComment } from '../../../src/app/utils/github/discussion';
import { getCommands } from '../../../src/app/commands';

vi.mock('../../../src/app/utils/github/discussion', () => ({
	createDiscussionComment: vi.fn()
}));

// getCommands をモック化
vi.mock('../../../src/app/commands', () => ({
	getCommands: vi.fn()
}));

describe('howToCommandHandler', () => {
	const mockCommands = [
		{ name: 'help', description: 'ヘルプを表示', types: ['issue', 'discussion'], args: { description: ' - ' } },
		{ name: 'review', description: 'レビューを実行', types: ['pull_request'], args: { description: ' - ' } }
	];

	const baseTable = `## 📖 コマンド一覧

| command | description | arguments | available |
|---|---|---|---|
| help | ヘルプを表示 |  -  | issue, discussion |
| review | レビューを実行 |  -  | pull_request |`;

	const tipText = `

> [!TIP]
> コマンドの後ろに半角スペースを入れ、引数を渡すことでより詳細に指示を与えることができます。
> （例）\`/act このIssueの内容を要約して\``;

	const expectedTable = `${baseTable}${tipText}`;

	beforeEach(() => {
		vi.clearAllMocks();
		(getCommands as Mock).mockReturnValue(mockCommands);
	});

	it('should create comment for issues', async () => {
		const mockContext = {
			payload: {
				issue: {
					number: 123
				},
				repository: {
					owner: {
						login: 'testOwner'
					},
					name: 'testRepo'
				}
			},
			octokit: {
				issues: {
					createComment: vi.fn()
				}
			},
			issue: vi.fn().mockReturnValue({
				owner: 'testOwner',
				repo: 'testRepo',
				issue_number: 123,
				body: expectedTable
			})
		};

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		await howToCommandHandler(mockContext as any);

		expect(mockContext.octokit.issues.createComment).toHaveBeenCalledWith({
			owner: 'testOwner',
			repo: 'testRepo',
			issue_number: 123,
			body: expectedTable
		});
	});

	it('should create comment for discussions', async () => {
		const mockContext = {
			payload: {
				discussion: {
					node_id: 'D_123'
				}
			},
			octokit: {}
		};

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		await howToCommandHandler(mockContext as any);

		expect(createDiscussionComment).toHaveBeenCalledWith(
			mockContext.octokit,
			'D_123',
			expectedTable
		);
	});

	it('should throw error for unknown event types', async () => {
		const mockContext = {
			payload: {}
		};

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		await expect(howToCommandHandler(mockContext as any))
			.rejects
			.toThrow('Unknown event type');
	});

	it('should generate correct table format', async () => {
		const mockContext = {
			payload: {
				issue: {
					number: 123
				}
			},
			octokit: {
				issues: {
					createComment: vi.fn()
				}
			},
			issue: vi.fn().mockReturnValue({
				body: expectedTable
			})
		};

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		await howToCommandHandler(mockContext as any);

		const expectedBody = `## 📖 コマンド一覧

| command | description | arguments | available |
|---|---|---|---|
| help | ヘルプを表示 |  -  | issue, discussion |
| review | レビューを実行 |  -  | pull_request |${tipText}`;

		expect(mockContext.issue).toHaveBeenCalledWith({
			body: expectedBody
		});
	});

	it('should handle empty commands array', async () => {
		(getCommands as Mock).mockReturnValue([]);

		const mockContext = {
			payload: {
				issue: {
					number: 123
				}
			},
			octokit: {
				issues: {
					createComment: vi.fn()
				}
			},
			issue: vi.fn().mockReturnValue({
				body: `## 📖 コマンド一覧

| command | description | arguments | available |
`
			})
		};

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		await howToCommandHandler(mockContext as any);

		const emptyTable = `## 📖 コマンド一覧

| command | description | arguments | available |
|---|---|---|---|
${tipText}`;

		expect(mockContext.issue).toHaveBeenCalledWith({
			body: emptyTable
		});
	});

	it('should ignore args parameter', async () => {
		const mockContext = {
			payload: {
				issue: {
					number: 123
				}
			},
			octokit: {
				issues: {
					createComment: vi.fn()
				}
			},
			issue: vi.fn().mockReturnValue({
				body: expectedTable
			})
		};

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		await howToCommandHandler(mockContext as any, 'some-arg');

		expect(mockContext.issue).toHaveBeenCalledWith({
			body: expectedTable
		});
	});
});