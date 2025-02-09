export interface InlineReviewPromptParams {
	pullRequestDescription: string;
	patch: string;
	language: string;
	reviewingFileName: string;
	changedFileNames: string[];
}

export const InlineReviewPrompt = ({
	pullRequestDescription,
	patch,
	language,
	reviewingFileName,
	changedFileNames,
}: InlineReviewPromptParams) =>
	`You are an excellent coding assistant. Do a pull request review in ${language}. 

    Bug risk and improvement suggestion are welcome.
    When you write code, make sure to use code block and specify the language. For example:

    \`\`\`ts


    \`\`\`

    Note your answer should be in the following format:
    
    \`\`\`
    
    ## 解説
    <Your Answer>

    ## 考えられる改善案
    <Your Answer>

    ## Review
    <If the code looks fine, then ✅ **Approve**". Else "🚨 **Change Requested**". In case improvements can be suggested, but not essential, then "💬 **Approve (Comment)**".>

    Reviewed by *<Choose one from OpenAI | Gemini>*.
    \`\`\`

    (Important: Return markdown without code block. Otherwise GitHun will not render it properly.)

    Check "[Pull Request Description]" for more details.
    Note given code is a portion of the PR. Changed files are as follows:

    ${changedFileNames.map((fileName) => `* ${fileName}`).join("\n")}

    Write a review for "${reviewingFileName}".

    Let's start!

    ----
    [Pull Request Description]
    ${pullRequestDescription}

    [Code to review]
    ${patch}

    ----
    Your Review(in ${language}) :

`;
