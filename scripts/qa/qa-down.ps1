<#
.SYNOPSIS
  Stops the QA stack started by qa-up.ps1 (plan 408): kills the PID trees in .claude/.qa-pids, then any dev
  server still listening on 4205/3005/4206, confirms the ports are free and deletes the pid file.
#>
param([string] $Root = '')

$ErrorActionPreference = 'Stop'
if (-not $Root) { $Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path }
$pidFile = Join-Path $Root '.claude\.qa-pids'
$ports = 3005, 4205, 4206
$devServer = '\b(node|nodemon|npm|npx|ng|vite|tsx|ts-node)(\.exe|\.cmd|\.js)?\b'

function Get-PortOwner([int] $port) {
  $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($c) { return [int] $c.OwningProcess }
  return $null
}

# taskkill writes to stderr for an already-gone PID; under 'Stop' PowerShell 5.1 would throw on it.
function Stop-Tree([int] $procId) {
  $ErrorActionPreference = 'Continue'
  & taskkill.exe /PID $procId /T /F *> $null
}

if (Test-Path $pidFile) {
  try { $recorded = @((Get-Content $pidFile -Raw | ConvertFrom-Json).pids) } catch { $recorded = @() }
  foreach ($procId in $recorded) { Stop-Tree ([int] $procId) }
}

# A watch-mode child that escaped the tree, or a run whose pid file was lost.
foreach ($port in $ports) {
  $owner = Get-PortOwner $port
  if (-not $owner) { continue }
  $p = Get-CimInstance Win32_Process -Filter "ProcessId=$owner" -ErrorAction SilentlyContinue
  $cmd = if ($p -and $p.CommandLine) { $p.CommandLine } else { '' }
  if (-not $cmd -or $cmd -match $devServer) { Stop-Tree $owner }
}

$busy = @()
foreach ($port in $ports) {
  $end = (Get-Date).AddSeconds(10)
  while ((Get-PortOwner $port) -and (Get-Date) -lt $end) { Start-Sleep -Milliseconds 500 }
  if (Get-PortOwner $port) { $busy += $port }
}
if (Test-Path $pidFile) { Remove-Item $pidFile -Force }

if ($busy.Count) {
  Write-Output "QA: ports still held: $($busy -join ', ') - not a dev server, left alone"
  exit 1
}
Write-Output 'QA: down'
exit 0
