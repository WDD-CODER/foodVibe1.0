<#
.SYNOPSIS
  Nightly QA, step 2 (plan 415): run by the "FoodVibe Code QA merge" Windows task (02:45) inside the QA checkout.
  Merges tonight's code reviews (bugs/qa-runs/code-qa/<today>/review-*.md, written by the 01:00 Cowork Code QA
  agent) into ledger.json and latest.md, so the 03:00 UI agent sees them. Everything goes to
  bugs/qa-runs/.nightly.log; rotation.mjs adds its own "CODE-QA: ingest …" lines there.
#>
param([Parameter(Mandatory = $true)] [string] $Root)

$ErrorActionPreference = 'Continue'
$logDir = Join-Path $Root 'bugs\qa-runs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir '.nightly.log'

function Write-Log([string] $msg) {
  $line = "$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss')) merge $msg"
  Add-Content -Path $log -Value $line -Encoding UTF8
}

$today = (Get-Date).ToString('yyyy-MM-dd')
$script = Join-Path $Root 'scripts\qa\code-qa\rotation.mjs'
if (-not (Test-Path $script)) {
  Write-Log "FAIL: no $script"
  exit 1
}

Write-Log "start (ingest $today)"
Push-Location $Root
try {
  $out = & node.exe $script 'ingest' "--date=$today" '--nightly' 2>&1 | Out-String
  $code = $LASTEXITCODE
} catch {
  $out = $_.Exception.Message
  $code = 1
} finally {
  Pop-Location
}
if ($code -ne 0) {
  foreach ($l in ($out -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -Last 15)) { Write-Log "  $l" }
}
Write-Log "done (exit $code)"
exit $code
