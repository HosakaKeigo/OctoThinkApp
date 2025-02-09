import { describe, test, expect } from "vitest";
import { parseCommand } from "../../../src/app/commands/helper/parseCommand";

describe("parseCommand", () => {
	test("基本的なコマンドとパラメータを正しくパースする", () => {
		const result = parseCommand("/test arg1 arg2");
		expect(result).toEqual({
			command: "test",
			args: "arg1 arg2",
		});
	});

	test("パラメータのない場合も正しくパースする", () => {
		const result = parseCommand("/test");
		expect(result).toEqual({
			command: "test",
			args: undefined,
		});
	});

	test("改行を含むパラメータを正しくパースする", () => {
		const input = `/create first line
second line
third line`;
		const result = parseCommand(input);
		expect(result).toEqual({
			command: "create",
			args: "first line\nsecond line\nthird line",
		});
	});

	test("先頭と末尾の空白を除去する", () => {
		const result = parseCommand("  /test  arg1  \n  arg2  ");
		expect(result).toEqual({
			command: "test",
			args: "arg1  \n  arg2",
		});
	});

	test("コマンド形式でない入力の場合はnullを返す", () => {
		expect(parseCommand("これは普通のコメント")).toBeNull();
		expect(parseCommand("test/command")).toBeNull();
		expect(parseCommand("")).toBeNull();
		expect(parseCommand("  ")).toBeNull();
	});

	test("コマンド名に使用できない文字が含まれる場合はnullを返す", () => {
		expect(parseCommand("/test-command")).toBeNull();
		expect(parseCommand("/test/command")).toBeNull();
		expect(parseCommand("/test.command")).toBeNull();
	});

	test("複数行のコマンドとパラメータを含む場合", () => {
		const input = `/create Title: Bug report
Description: This is a multi-line
bug report that contains
multiple paragraphs.

Steps to reproduce:
1. First step
2. Second step`;
		const result = parseCommand(input);
		expect(result).toEqual({
			command: "create",
			args: `Title: Bug report
Description: This is a multi-line
bug report that contains
multiple paragraphs.

Steps to reproduce:
1. First step
2. Second step`,
		});
	});
});
