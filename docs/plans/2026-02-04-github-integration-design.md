# GitHub CLI Integration Design

## Overview

Integrate GitHub CLI (`gh`) to fetch PR and issue information, enhancing the code review workflow with contextual data.

## Goals

- View pending PRs (created by user and awaiting review) in a unified interface
- Support multiple GitHub accounts with manual selection per repository
- Link issues or manual context to AI code reviews
- Visual indicators on branches that have associated PRs

## Non-Goals

- PR actions (approve, merge, close) - open in browser instead
- General issue listing
- Automatic polling for updates

## Data Structures

### PullRequest

```typescript
interface PullRequest {
  number: number;
  title: string;
  author: string;
  state: 'open' | 'closed' | 'merged';
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;

  headBranch: string;
  baseBranch: string;

  reviewStatus: {
    approved: number;
    changesRequested: number;
    pending: string[];
  };

  checksStatus: 'success' | 'failure' | 'pending' | 'neutral';

  labels: string[];
  milestone: string | null;
  commentsCount: number;
  mergeable: boolean | null;

  url: string;
}
```

### Issue

```typescript
interface Issue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  author: string;
  labels: string[];
  url: string;
}
```

### GitHubAccount

```typescript
interface GitHubAccount {
  username: string;
  isActive: boolean;
}
```

### ReviewContext

```typescript
interface ReviewContext {
  type: 'issue' | 'manual';
  issueNumber?: number;
  issueContent?: Issue;
  manualContext?: string;
}
```

## Architecture

### Electron Layer

```
electron/
  github/
    executor.ts      # Spawn gh CLI with specific account
    parser.ts        # Parse gh JSON output
    commands/
      auth.ts        # List accounts, check status
      pr.ts          # List PRs, get details
      issue.ts       # Get issue by number
    ipc-handlers.ts  # Register IPC handlers
```

### IPC API

```typescript
github: {
  getAccounts: () => Promise<GitHubAccount[]>,
  setActiveAccount: (username: string) => Promise<void>,

  listPullRequests: (options: {
    account: string;
    repo?: string;
    type: 'created' | 'review-requested' | 'all';
  }) => Promise<PullRequest[]>,

  getPullRequestForBranch: (branch: string) => Promise<PullRequest | null>,

  getIssue: (number: number) => Promise<Issue | null>,

  openInBrowser: (url: string) => void,
}
```

### GH CLI Commands Used

- `gh auth status` - list accounts
- `gh auth switch --user <username>` - switch active account
- `gh pr list --repo <repo> --json <fields> --limit 100` - list PRs
- `gh pr view <number> --repo <repo> --json <fields>` - PR details
- `gh issue view <number> --repo <repo> --json <fields>` - issue details

### Frontend Components

```
src/
  components/
    header/
      AccountSelector.tsx    # GitHub account dropdown in header
    pull-requests/
      PullRequestsTab.tsx    # Main sidebar tab
      PullRequestList.tsx    # PR list
      PullRequestItem.tsx    # Individual PR with status badges
      PullRequestFilters.tsx # Filters: created/review-requested/all
    branches/
      BranchItem.tsx         # Update to show PR indicator
    review/
      ReviewContextField.tsx # Issue number or free text field
```

### State Management

```typescript
// src/stores/github.ts
interface GitHubStore {
  accounts: GitHubAccount[];
  activeAccount: string | null;

  pullRequests: PullRequest[];
  prFilter: 'created' | 'review-requested' | 'all';
  prLoading: boolean;

  branchPrMap: Map<string, PullRequest>;

  loadAccounts: () => Promise<void>;
  setActiveAccount: (username: string) => Promise<void>;
  loadPullRequests: () => Promise<void>;
  refreshPullRequests: () => Promise<void>;
}

// src/stores/review.ts - additions
linkedIssue: Issue | null;
linkedIssueNumber: number | null;
reviewContext: ReviewContext | null;

setLinkedIssueNumber: (num: number | null) => Promise<void>;
setManualContext: (text: string) => void;
clearReviewContext: () => void;
```

## Flows

### Repository Open Flow

1. `loadAccounts()` fetches accounts from GH CLI
2. Check if account saved for this repo (`repoAccountMap` in electron-store)
3. **If no saved account:** Show modal prompting user to select account
4. **If saved account exists:** Use it automatically, load PRs
5. Save preference keyed by remote URL

### Account Persistence

```typescript
// electron-store structure
{
  repoAccounts: {
    "github.com/owner/repo": "otavioaphelios",
    "github.com/other/project": "otaviosoaresp"
  }
}
```

### Account Switch Flow

1. `setActiveAccount(username)` executes `gh auth switch`
2. Clear `pullRequests` and `branchPrMap`
3. Reload PRs with new account
4. Save new preference for repo

### Review with Context Flow

1. User optionally sets context (issue number or free text)
2. If issue number: fetch content via `getIssue(number)`
3. Get diff normally
4. Build prompt combining context + diff:

```
## Task Context
Issue #${issue.number}: ${issue.title}

${issue.body}

---

Review the following code changes and evaluate if they properly address the requirements above.
```

5. Send to configured AI provider

### Manual Refresh

- Button in PR tab triggers `refreshPullRequests()`
- Updates `branchPrMap` for branch indicators

## UI Details

### AccountSelector (Header)

- Dropdown showing active account (username)
- Lists all accounts from `gh auth status`
- On change: updates global state, reloads PR data
- Shows placeholder if no GH CLI or no accounts

### PR Indicator on BranchItem

- Small icon/badge when branch has associated PR
- Color by state: green (open), purple (draft), gray (merged/closed)
- Tooltip shows PR title
- Click navigates to PR tab or opens in browser

### ReviewContextField

- Toggle/tabs: "Issue #" | "Free text"
- **Issue mode:** Numeric input, fetches via GH CLI, shows title preview
- **Free text mode:** Textarea for requirements, specs, ticket content
- Both optional - review works without context

## Dependencies

- GH CLI installed and authenticated (for PR/issue features)
- Works without GH CLI using manual context only

## Future Considerations

- Auto-detect issue from PR description ("closes #123")
- Polling for PR updates
- PR actions (approve, comment) without leaving app
