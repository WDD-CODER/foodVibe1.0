# Test → PR → Review → Merge (Trunk Merge)

Run all tests, open a PR into `main`, review it, fix issues, and merge.

## Preconditions (Fail Fast)

```bash
git status                              # Working tree must be clean
git rev-parse --abbrev-ref HEAD         # Must NOT be on main
gh auth status                          # GitHub CLI authenticated
node -v; npm -v                         # Node/npm present
```

## 1. Sync Trunk

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git checkout -
```

## 2. Run All Tests

### Unit Tests (Jasmine/Karma)

```bash
npm test -- --no-watch --browsers=ChromeHeadless
```

### Build Verification

```bash
npx ng build --configuration=production
```

### Optional: E2E (Playwright)

Only if environment is ready:
```bash
npx playwright install
npx playwright test
```

## 3. Push Branch

```bash
git push -u origin HEAD
```

## 4. Create PR

```bash
branch=$(git rev-parse --abbrev-ref HEAD)
gh pr create --base main --head "$branch" --title "$branch" --body "$(cat <<'EOF'
## Summary

[Description of changes]

## Test Plan

- [ ] Unit tests pass
- [ ] Build succeeds
- [ ] Manual verification
EOF
)"
```

## 5. Review PR

```bash
pr=$(gh pr view --json number -q .number)
gh pr diff "$pr"
gh pr checks "$pr"
```

If anything fails: fix locally, re-run tests, commit, `git push`, re-check.

## 6. Merge

```bash
pr=$(gh pr view --json number -q .number)
gh pr merge "$pr" --merge --auto --delete-branch
```

## 7. Confirm

```bash
git checkout main
git pull --ff-only origin main
git log -1 --oneline
```
