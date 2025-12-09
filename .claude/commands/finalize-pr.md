Finalize PR for the current branch

## Workflow

1. **Check current branch and status**
   - Run `git branch --show-current` to get the current branch name
   - Run `git status` to check for uncommitted changes
   - Extract the Linear issue ID from the branch name (e.g., `BG-733` from `BG-733-taxonomy-embeddings`)

2. **Commit any uncommitted changes**
   - If there are uncommitted changes, stage and commit them
   - Use a descriptive commit message referencing the Linear issue
   - Format: "feat: description [BG-XXX]" or "fix: description [BG-XXX]"

3. **Run type checker and tests**
   - Run `npm run typecheck` to ensure no type errors
   - Run `npm run test:run` to ensure tests pass
   - Fix any errors before proceeding

4. **Get issue details from Linear**
   - Use the Linear MCP tools to fetch the issue title and description
   - This provides context for writing a good PR description

5. **Review all commits on the branch**
   - Run `git log main..HEAD --oneline` to see all commits
   - Run `git diff main...HEAD --stat` to see all changed files
   - Understand the full scope of changes for the PR description

6. **Push and create/update PR**
   - Run `git push -u origin <branch>` to push the branch
   - Use `gh pr create` to create the PR, or `gh pr edit` if it already exists

7. **Update PR title and description**
   - Use `gh pr edit` to set a clear title and comprehensive description
   - Title format: "feat: Clear description of the change [BG-XXX]"
   - Description should include:
     - **Summary**: 2-3 sentences explaining what this PR does
     - **Changes**: Bulleted list of key changes
     - **Linear issue link**: Link to the Linear issue
   - Example:
     ```
     gh pr edit --title "feat: Add taxonomy embeddings [BG-733]" --body "## Summary

     This PR adds taxonomy embedding support for product categorization.

     ## Changes

     - Add taxonomy loader and search functions
     - Add Supabase migration for embeddings table
     - Add populate-embeddings script

     Linear: https://linear.app/bubble-goods/issue/BG-733"
     ```

8. **Report completion**
   - Output the PR URL
   - Summarize what was done
