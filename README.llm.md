# Development Guide

## Overview
There are two main workflows for adding new features to the bot:

1. **Command-Based Workflow**: Add commands that can be triggered by users in comments.
2. **Action-Based Workflow**: Add actions that are triggered by specific events (e.g., issue opened).

## Command-Based Workflow

### File Structure

```
src/app/
┣ commands/
┃ ┣ command/
┃ ┃ ┣ issue/          # Issue specific commands
┃ ┃ ┣ pull_request/   # PR specific commands
┃ ┃ ┗ discussion/     # Discussion specific commands
┃ ┗ index.ts          # Command registration
```

### Implementation Steps

#### 1. Create Command Handler

Create a new file in appropriate directory (e.g., `commands/command/issue/myCommand.ts`):

```typescript
import type { Context } from "probot";

export const myCommandHandler = async (
  context: Context<"issue_comment.created">,
  args?: string
) => {
  try {
    // Implementation
    // You can access:
    // context.payload.issue - Issue data
    // context.payload.comment - Comment data
    // args - Command arguments (string after command)

    // Example: Add a reaction to comment
    await context.octokit.reactions.createForIssueComment({
      owner: context.repo().owner,
      repo: context.repo().repo,
      comment_id: context.payload.comment.id,
      content: 'rocket'
    });
  } catch (error) {
    console.error("Error in myCommand:", error);
    throw error;
  }
};
```

#### 2. Register Command

Add to `commands/index.ts` in `AllCommands` array:

```typescript
const AllCommands: Command[] = [
  // ... existing commands
  {
    name: "mycommand",
    description: "Description of what your command does",
    pattern: /^\/mycommand/i,
    handler: myCommandHandler,
    args: {
      type: "string",
      description: "Description of arguments",
      optional: true  // or false if args are required
    },
    types: ["issue"], // Where command can be used: "issue", "pull_request", "discussion"
    removeCommand: true  // Remove command comment after execution
  }
];
```

#### 3. Add Command to `config.yml`
Add command name to `enabledCommands` in `config.yml`:

### Command Interface

```typescript
interface Command {
  name: string;          // Command name
  description: string;   // Help text
  pattern: RegExp;       // Command trigger pattern
  handler: CommandHandler;
  args?: {
    type: string;
    description: string;
    optional?: boolean;
  };
  types: CommandContext[];  // Where it can be used
  removeCommand: boolean;   // Remove comment after execution
  notCallableByLlm?: boolean;  // Prevent LLM from calling this
}
```

## Action-Based Workflow

### File Structure

```
src/app/
┣ actions/
┃ ┣ index.ts         # Export actions
┃ ┣ addToMonthly.ts
┃ ┣ createSummary.ts
┃ ┗ setLabel.ts
┗ handlers/
  ┗ issue/
    ┣ onIssueOpened.ts
    ┗ onIssueClosed.ts
```

### Implementation Steps

#### 1. Create Action File

Create `actions/myNewAction.ts`:

```typescript
import type { Context } from "probot";

export const myNewAction = async (context: Context<"issues.opened" | "issues.closed">) => {
  try {
    // Implement your action using context.octokit
    // Example: Add label
    const { owner, repo } = context.repo();
    await context.octokit.issues.addLabels({
      owner,
      repo,
      issue_number: context.payload.issue.number,
      labels: ["my-label"]
    });
  } catch (error) {
    console.error("Error in myNewAction:", error);
    throw error;
  }
};
```

#### 2. Export Action

Add to `actions/index.ts`:

```typescript
export { myNewAction } from "./myNewAction";
```

#### 3. Register Action

For issue open (`handlers/issue/onIssueOpened.ts`):
```typescript
const defaultActions = [
  {
    name: "setLabelToIssue",
    action: setLabelToIssue,
  },
  {
    name: "myNewAction",
    action: myNewAction,
  },
];
```

For issue close (`handlers/issue/onIssueClosed.ts`):
```typescript
const defaultActions = [
  {
    name: "createIssueSummary",
    action: createIssueSummary,
  },
  {
    name: "myNewAction",
    action: myNewAction,
  },
];
```

#### 4. Add GitHub API Methods (if needed)

If your action needs new GitHub API operations, add them to `utils/github/issue.ts`:

```typescript
export async function newGitHubOperation(
  context: Context,
  issueNumber: number,
) {
  const { owner, repo } = context.repo();
  await context.octokit.issues.someOperation({
    owner,
    repo,
    issue_number: issueNumber,
  });
}
```
