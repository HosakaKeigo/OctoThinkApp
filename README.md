# GitHub App

> A GitHub App built with [Probot](https://github.com/probot/probot)

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── actions/       # Triggered by Issue Open / Close events
│   ├── commands/      # Triggered by comments
│   ├── handlers/      # Event handlers.
│   ├── prompts/       # Prompts. Use with Backend
│   ├── utils/         # Extracted utilities
│   └── index.ts       # Entry point for Probot
└── index.ts           # Entry point for Firebase Functions
```

### Event Flow

```mermaid
flowchart TD
    GH[GitHub Webhook] --> Events[Event Handler]
    Events --> Auth
    Auth -->|Bot| Stop
    Auth -->|not Allowed User| Stop
    Auth -->|Allowed User| Handlers[Event Handlers]

    Handlers --> IO[Issue Opened]
    Handlers --> IC[Issue Closed]
    Handlers --> COM[Comment Created]

    IO --> Labels[Add Labels]
    IO --> Project[Add to Project]

    IC --> Summary[Issue summary]

    COM --> CMD{Commandあり?}
    CMD -->|Yes| CH[Command Handler]
    CMD -->|No| Stop

    subgraph Commands["Command List"]
        direction TB
        Con["/consult"]
        For["/format"]
        Lab["/label"]
        Cre["/create"]
        Rev["/review"]
    end

    CH --> Con
    CH --> For
    CH --> Lab
    CH --> Cre
    CH --> Rev

    Con --> LLM
    Rev --> LLM

    Stop --> End
```


## Features
### Event Based Features

| Event | Feature | Description |
|---------|------|------|
| IssueOpened | Label Assignment | - Analyzes issue content and automatically selects appropriate labels<br>- Considers existing label descriptions<br>- Uses LLM for content understanding and classification |
|  | Project Addition | - Automatically adds to monthly projects (e.g., 2024/12)<br>- Skips if project doesn't exist |
| IssueClosed | Summary Generation | - Generates summary of entire issue (including comments)<br>- Structures resolved problems, steps, and results<br>- Extracts keywords for future reference |
| IssueCommentCreated | Command Processing | - Determines if comment is a command format (/command)<br>- Executes corresponding command handler<br>- Automatically removes bot and command comments |

### Command Based Features

| Command | Feature | Description |
|---------|------|------|
| /howto | Usage | - Displays available commands |
| /question | Question | - Send request to AI. AI recognizes Issue context as context. |
| /consult | Suggestions | - Suggests issue solutions<br>- Gets opinions from multiple LLMs<br>- Displays each LLM's response separately |
| /format | Formatting | - Formats to specified template<br>- Completes necessary sections |
| /label | Label | - Selects appropriate labels from content<br>- Considers existing label descriptions |
| /create | Issue Creation | - Creates new related issues<br>- Adds reference to original issue |
| /review | PR Review | - Analyzes code differences<br>- Gets reviews from multiple LLMs |
| /inlineReview | PR Review | - File-by-file review. Only considers PR description<br>- Gets reviews from multiple LLMs |
| /search | Search | - search relevant issues from previously closed issues. (experimental) |

etc.

>[!Important]
>`/search` command requires firestore setup. Follow the step below.
> 1. Create Firestore database
> 2. Create composite index for `search` collection.(This may take a few minutes)
>
>- `gcloud alpha firestore indexes composite create --collection-group=github-issues --query-scope=COLLECTION --field-config field-path=embedding_field,vector-config='{"dimension":"768", "flat": "{}"}' --database="(default)"`

## Setup
You need to set up the following services.

- [x] Backend (Cloud Run)
- [x] GitHub App（Probot）
- [x] Google Secret Manager
- [x] Firebase Project
- [x] GitHub Actions

### Backend Setup
Follow the instruction in the backend repository.

https://github.com/HosakaKeigo/OctoThinkBackend

### Start local server
```sh
$cd functions
$npm install

# Run the bot. This will create .env file.
$npm start
```

### Register GitHub App
- Navigate to `http://localhost:3000`

![Register App](./assets//setup-probot.png)

- Authenticate to GitHub
- Register the app

### Check generated Env
Check `.env` file generated in the root directory. It should contain the following properties.

```
WEBHOOK_PROXY_URL=https://smee.io/1K1akW5O8MylGkQT
APP_ID=xxxxxxx
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nxxxxxxx...xxxxxxx==\n-----END RSA PRIVATE KEY-----\n"
WEBHOOK_SECRET=xxxxxxx
GITHUB_CLIENT_ID=xxxxxxx # not used
GITHUB_CLIENT_SECRET=xxxxxxx # not used
```

Use Google Secret Manager to store these generated secrets for more security.

### Setup Google Secret Manager
- GITHUB_BOT_CONFIG (or any name corresponding to `functions/src/index.ts`)
  - stringified JSON with the following properties.
  - Create `.secret.local` to mock the secret locally.

```json
{
  "APP_ID": "123",
  "WEBHOOK_SECRET": "xxxxxxxxxx",
  "PRIVATE_KEY": "-----BEGIN RSA PRIVATE KEY-----\n...-----END RSA PRIVATE KEY-----\n"
}
```

### Create `.env` (If you want to deploy manually)
- BACKEND_URL: Cloud Run Endpoint

### Firebase Setup
- Setup Firebase project with Blaze plan.

>[!Note]
>Firebase project must be the same project as the backend Cloud Run service.

- initialize Firebase Functions. Choose "no" for questions about overwriting files.

```sh
$firebase login
$firebase init --only functions
? Please select an option: Use an existing project
? Select a default Firebase project for this directory: <your-project>
? What language would you like to use to write Cloud Functions? TypeScript
? Do you want to use ESLint to catch probable bugs and enforce style? No
? File functions/package.json already exists. Overwrite? No
i  Skipping write of functions/package.json
? File functions/tsconfig.json already exists. Overwrite? No
i  Skipping write of functions/tsconfig.json
? File functions/src/index.ts already exists. Overwrite? No
i  Skipping write of functions/src/index.ts
i  functions/.gitignore is unchanged
? Do you want to install dependencies with npm now? No
```

## Deploy
### manual
Firebase Functions

```sh
$npm run deploy
```

Make sure to replace smee URL with the actual Firebase Functions webhook URL in the GitHub App setting.
![setup webhook](./assets/setup-webhook.png)

### GitHub Actions

>[!tip]
> The following steps can be automated using `init.sh` script.
>
> ```sh
> $chmod +x init.sh
> $./init.sh
> ```
>
> This script will setup workload identity, ID pool, enable APIs.
> Don't forget to setup repository secret.

#### Setup Workload Identity
Create service account with the following roles.

- Cloud RuntimeConfig Admin
- Firebase Admin
- Secret Manager Admin
- Workload Identity User
- Service Account User
- Artifact Registry Admin

#### Setup ID Pool
- Navigate to IAM > Workload Identity Federation
- Add provider
  - OpenID Connect (OIDC)
  - issuer-url: `https://token.actions.githubusercontent.com`
  - Attribute mappings: `google.subject`: `assertion.repository	`
  - Attribute conditions: `assertion.repository_owner == <owner_name>`
- Grant access to service account
  - Use Service account impersonation
  - Principal attribute: `subject`
  - Principal value: `owner/repo`

#### Enable APIs
- Firebase Extensions API
- Eventarc API
- Cloud Billing API

#### Setup Repository Secret
Setup Repository Secret of your GitHub repository with the following properties.

![Repository Secret](./assets/setup-repo-secret.png)

- GCLOUD_PROJECT_ID
  - Project ID
- BACKEND_URL
  - Cloud Run Backend URL
- SERVICE_ACCOUNT
  - `<name>@<project-id>.iam.gserviceaccount.com` 
- WORKLOAD_IDENTITY_PROVIDER
  - `projects/<project-number>/locations/global/workloadIdentityPools/<pool-id>/providers/<provider-id>`

##### Reference
https://zenn.dev/cloud_ace/articles/firebase-deploy-automation-github-actions


## Backend

https://github.com/HosakaKeigo/OctoThinkBackend