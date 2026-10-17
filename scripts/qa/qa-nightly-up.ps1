<#
.SYNOPSIS
  Nightly QA, step 1 (plan 408): run by the "FoodVibe QA up" Windows task inside the dedicated QA checkout.
  Fast-forwards to origin/main, reinstalls dependencies when a lockfile changed, then runs qa-up.ps1.
  Every step and its exit status goes to bugs/qa-runs/.nightly.log. Nothing throws before it is logged:
  when this fails, the 03:00 Cowork run finds the servers down and writes its own BLOCKED.md.
#>
param([Parameter(Mandatory = $true)] [string] $Root)

$ErrorActionPreference = 'Continue'
$logDir = Join-Path $Root 'bugs\qa-runs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir '.nightly.log'

function Write-Log([string] $msg) {
  $line = "$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss')) up    $msg"
  Add-Content -Path $log -Value $line -Encoding UTF8
}

# Runs a native command in $dir, logs its output and exit code, returns the exit code.
function Invoke-Step([string] $label, [string] $dir, [string] $exe, [string[]] $argList) {
  Push-Location $dir
  try {
    $out = & $exe @argList 2>&1 | Out-String
    $code = $LASTEXITCODE
  } catch {
    $out = $_.Exception.Message
    $code = 1
  } finally {
    Pop-Location
  }
  foreach ($l in ($out -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -Last 15)) { Write-Log "  $l" }
  Write-Log "$label -> exit $code"
  return $code
}

# sha256 of a lockfile, remembered per checkout so npm ci only runs when it changed.
function Test-LockChanged([string] $dir, [string] $stateName) {
  $lock = Join-Path $dir 'package-lock.json'
  if (-not (Test-Path $lock)) { return $false }
  $state = Join-Path $Root ".claude\$stateName"
  $hash = (Get-FileHash $lock -Algorithm SHA256).Hash
  $old = if (Test-Path $state) { (Get-Content $state -Raw).Trim() } else { '' }
  if ($hash -eq $old -and (Test-Path (Join-Path $dir 'node_modules'))) { return $false }
  New-Item -ItemType Directory -Force -Path (Split-Path $state) | Out-Null
  Set-Content -Path $state -Value $hash -Encoding ASCII
  return $true
}

Write-Log "start (root $Root)"
if (-not (Test-Path (Join-Path $Root 'package.json'))) {
  Write-Log 'FAIL: root is not a FoodVibe checkout'
  exit 1
}

Invoke-Step 'git fetch origin main' $Root 'git' @('fetch', 'origin', 'main') | Out-Null
$ff = Invoke-Step 'git merge --ff-only origin/main' $Root 'git' @('merge', '--ff-only', 'origin/main')
if ($ff -ne 0) { Write-Log 'not fast-forwardable - continuing on the current tree' }

foreach ($pair in @(@($Root, 'qa-lock-root.sha256'), @((Join-Path $Root 'server'), 'qa-lock-server.sha256'))) {
  if (Test-LockChanged $pair[0] $pair[1]) {
    $code = Invoke-Step "npm ci ($($pair[0]))" $pair[0] 'npm.cmd' @('ci')
    if ($code -ne 0) { Remove-Item (Join-Path $Root ".claude\$($pair[1])") -ErrorAction SilentlyContinue }
  }
}

$up = Invoke-Step 'qa-up.ps1' $Root 'powershell.exe' @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $Root 'scripts\qa\qa-up.ps1'), '-Root', $Root)
Write-Log "done (qa-up exit $up)"
exit $up
