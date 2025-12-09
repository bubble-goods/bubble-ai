# Solve Linear Issue

Work on a Linear issue with proper git workflow practices.

## Usage

Call this command with a Linear issue ID to try to solve the issue with the
given issue_id.

**Parameters:**

- `issue_id`: The Linear issue identifier (e.g., BG-733)

## What this command does

1. **Validates current git state** - Ensures you're on master/main branch
2. **Creates a dedicated branch** - Format: `{issue_id}-{desc}`
3. **Sets up proper workflow** - Prepares for development with Linear issue tracking
4. **Solve the issue** - Analyzes and solves the issue

## Implementation

When this command is called:

1. Check current git branch and warn if not on master/main
2. Make sure the issue_id is given. If not, ask for it explicitly
3. Find the issue in Linear
4. Understand the problem described in the issue
5. Read the comments if there are implementation clues or other details that
   would consider you to implement the fix in a particular way.
6. Use the data in the Linear issue to understand the requirements.
7. Search the codebase for relevant files
8. Create a new branch with format: `{issue_id}-{desc}` where desc is a compact
   description (few words kebab-cased). Make sure you preserve the case for the
   issue id.
9. Switch to the new branch
10. Set the Linear issue to 'In Progress'.
11. Implement the necessary changes to fix the issue
12. Write and run tests to verify the fix: `npm run test:run`
13. Run TypeScript type checker to ensure no type errors: `npm run typecheck`
14. Ensures the code passes linting, using `npm run lint:fix`.
15. Check if the README is still correct, given the changes. Correct when
    needed.
16. Commit the changes with a sensible commit message.
17. Create a PR with a sensible title and a clear message. Highlight how these
    changes fix the issue. Take care that — when printing the URL of the PR -
    there's space around it so that it can clicked in the terminal.

## Example Branch Names

- `BG-733-taxonomy-embeddings` (for issue BG-733)
- `BG-734-product-categorization` (for issue BG-734)

## Git Commands Used

```bash
git branch --show-current
git checkout -b "{issue_id}-{desc}"
```
