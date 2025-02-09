interface CommandMatch {
	command: string;
	args?: string;
}

/**
 * Parse command from the comment body.
 *
 * e.g. "/command arg1" => { command: "command", args: "arg1" }
 */
export function parseCommand(body: string): CommandMatch | null {
	const commandPattern = /^\/(\w+)(?:\s+([\s\S]*))?$/;
	const match = body.trim().match(commandPattern);

	if (!match) return null;

	return {
		command: match[1],
		args: match[2]?.trim(),
	};
}
