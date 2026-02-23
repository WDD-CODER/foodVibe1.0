# Test → PR → Review → Merge (Trunk Merge)

Run all tests, open a PR into `main`, review it, fix issues, and merge.

## Preconditions (Fail Fast)

```powershell
git status                              # Working tree must be clean
git rev-parse --abbrev-ref HEAD         # Must NOT be on main
gh auth status                          # GitHub CLI authenticated
node -v; npm -v                         # Node/npm present
```

## 1. Sync Trunk

```powershell
git fetch origin
git checkout main
git pull --ff-only origin main
git checkout -
```

## 2. Run All Tests

### Unit Tests (Jasmine/Karma)

```powershell
npm test -- --no-watch --browsers=ChromeHeadless
```

### Build Verification

```powershell
npx ng build --configuration=production
```

### Optional: E2E (Playwright)

Only if environment is ready:
```powershell
npx playwright install
npx playwright test
```

## 3. Push Branch

```powershell
git push -u origin HEAD
```

## 4. Create PR

```powershell
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
gh pr create --base main --head $branch --title "$branch" --body "## Summary`n`n[Description of changes]`n`n## Test Plan`n`n- [ ] Unit tests pass`n- [ ] Build succeeds`n- [ ] Manual verification"
```

## 5. Review PR

```powershell
$pr = (gh pr view --json number -q .number).Trim()
gh pr diff $pr
gh pr checks $pr
```

If anything fails: fix locally, re-run tests, commit, `git push`, re-check.

## 6. Merge

```powershell
$pr = (gh pr view --json number -q .number).Trim()
gh pr merge $pr --merge --auto --delete-branch
```

## 7. Confirm

```powershell
git checkout main
git pull --ff-only origin main
git log -1 --oneline
```
