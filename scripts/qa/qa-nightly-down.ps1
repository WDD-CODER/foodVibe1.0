<#
.SYNOPSIS
  Nightly QA, last step (plan 408): run by the "FoodVibe QA down" Windows task. Runs qa-down.ps1 in the QA
  checkout and appends its output and exit status to bugs/qa-runs/.nightly.log.
#>
param([Parameter(Mandatory = $true)] [string] $Root)

$ErrorActionPreference = 'Continue'
$logDir = Join-Path $Root 'bugs\qa-runs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir '.nightly.log'
$stamp = { (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') }

$out = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root 'scripts\qa\qa-down.ps1') -Root $Root 2>&1 | Out-String
$code = $LASTEXITCODE
foreach ($l in ($out -split "`r?`n" | Where-Object { $_.Trim() })) { Add-Content -Path $log -Value "$(& $stamp) down    $l" -Encoding UTF8 }
Add-Content -Path $log -Value "$(& $stamp) down  qa-down.ps1 -> exit $code" -Encoding UTF8

# Plan 422: the morning report (MORNING.md + history line), after QA stopped. Its own failure is logged, never fatal.
$rep = & node.exe (Join-Path $Root 'scripts\qa\morning-report.mjs') "--root=$Root" 2>&1 | Out-String
$repCode = $LASTEXITCODE
foreach ($l in ($rep -split "`r?`n" | Where-Object { $_.Trim() })) { Add-Content -Path $log -Value "$(& $stamp) down    $l" -Encoding UTF8 }
Add-Content -Path $log -Value "$(& $stamp) down  morning-report.mjs -> exit $repCode" -Encoding UTF8
exit $code
