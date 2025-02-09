/**
 * Remove markdown markers from LLM response
 * while preserving code blocks within the content
 */
export function cleanMarkdownResponse(text: string): string {
	// Remove ```markdown and ``` from the beginning and end
	return text
		.replace(/^```markdown\n/, "") // Remove leading ```markdown
		.replace(/^```\n/, "") // Remove leading ```
		.replace(/```\s*$/, "") // Remove trailing ```
		.trim();
}
