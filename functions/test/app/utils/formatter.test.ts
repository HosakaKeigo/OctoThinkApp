import { describe, expect, test } from "vitest";
import { cleanMarkdownResponse } from "../../../src/app/utils/formatter";

describe("cleanMarkdownResponse", () => {
	test("シンプルなレスポンスからmarkdownコードブロックのマーカーを削除する", () => {
		const input = "```markdown\nHello World\n```";
		expect(cleanMarkdownResponse(input)).toBe("Hello World");
	});

	test("内部のコードブロックはそのまま保持する", () => {
		const input =
			"```markdown\nHere is some code:\n```python\nprint('hello')\n```\nAnd more text\n```";
		const expected =
			"Here is some code:\n```python\nprint('hello')\n```\nAnd more text";
		expect(cleanMarkdownResponse(input)).toBe(expected);
	});

	test("複数の内部コードブロックを適切に処理する", () => {
		const input = [
			"```markdown",
			"Here is Python code:",
			"```python",
			"print('hello')",
			"```",
			"And here is TypeScript code:",
			"```typescript",
			"console.log('hello')",
			"```",
			"```",
		].join("\n");

		const expected = [
			"Here is Python code:",
			"```python",
			"print('hello')",
			"```",
			"And here is TypeScript code:",
			"```typescript",
			"console.log('hello')",
			"```",
		].join("\n");

		expect(cleanMarkdownResponse(input)).toBe(expected);
	});

	test("markdownマーカーのない通常のテキストはそのまま返す", () => {
		const input = "Just a normal text response";
		expect(cleanMarkdownResponse(input)).toBe("Just a normal text response");
	});

	test("終了マーカーのみの場合は適切に処理する", () => {
		const input = "Some text\n```";
		expect(cleanMarkdownResponse(input)).toBe("Some text");
	});

	test("空の入力を適切に処理する", () => {
		expect(cleanMarkdownResponse("")).toBe("");
	});

	test("空白のみの入力を適切に処理する", () => {
		expect(cleanMarkdownResponse("   \n  \t  ")).toBe("");
	});

	test("markdownマーカーのみの入力を適切に処理する", () => {
		expect(cleanMarkdownResponse("```markdown\n```")).toBe("");
	});

	test("コンテンツ内のマークダウンフォーマットは保持する", () => {
		const input = `\`\`\`markdown
# Header

- List item 1
- List item 2

**Bold text** and *italic text*

| Table | Header |
|-------|--------|
| Cell  | Cell   |
\`\`\``;
		const expected = `# Header

- List item 1
- List item 2

**Bold text** and *italic text*

| Table | Header |
|-------|--------|
| Cell  | Cell   |`;
		expect(cleanMarkdownResponse(input)).toBe(expected);
	});
});
