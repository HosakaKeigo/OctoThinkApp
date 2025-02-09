import { ActPrompt } from "./prompt/act";
import { AskDiscussionPrompt } from "./prompt/discussion/ask";
import { GeneralPrompt } from "./prompt/general";
import { addLabelsPrompt } from "./prompt/issue/addLabel";
import { AskIssuePrompt } from "./prompt/issue/ask";
import { CreateIssuePrompt } from "./prompt/issue/create";
import { FormatIssuePrompt } from "./prompt/issue/format";
import { SummarizeIssuePrompt } from "./prompt/issue/summarize";
import { InlineReviewPrompt } from "./prompt/pull_request/inlineReview";
import { ReviewPullRequestPrompt } from "./prompt/pull_request/review";

export const PROMPTS = {
	ACT: ActPrompt,
	GENERAL: GeneralPrompt,
	CREATE_ISSUE: CreateIssuePrompt,
	SUMMARIZE_ISSUE: SummarizeIssuePrompt,
	ASK_ISSUE: AskIssuePrompt,
	FORMAT_ISSUE: FormatIssuePrompt,
	ADD_LABELS: addLabelsPrompt,
	REVIEW_PR: ReviewPullRequestPrompt,
	INLINE_REVIEW: InlineReviewPrompt,
	ASK_DISCUSSION: AskDiscussionPrompt,
};
