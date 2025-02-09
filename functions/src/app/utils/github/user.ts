export interface GitHubUser {
	type: string;
	login: string;
}

export function isBotUser(user: GitHubUser) {
	return (
		user.type === "Bot" ||
		user.login.includes("[bot]") ||
		user.login.includes("github-actions")
	);
}
