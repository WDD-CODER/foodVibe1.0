# Install MemPalace git hooks into .git/hooks/
# Run once after cloning, or whenever hooks are updated.

$hooksDir = ".git/hooks"
$srcDir   = ".claude/hooks"

foreach ($hook in @("post-commit", "post-merge")) {
    $src  = Join-Path $srcDir $hook
    $dest = Join-Path $hooksDir $hook
    Copy-Item $src $dest -Force
    # Git bash needs unix line endings — ensure no CRLF
    (Get-Content $dest -Raw).Replace("`r`n", "`n") | Set-Content $dest -NoNewline
    Write-Host "Installed $hook"
}
Write-Host "Done. Hooks active in .git/hooks/"
