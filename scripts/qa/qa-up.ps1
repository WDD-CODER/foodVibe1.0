<#
.SYNOPSIS
  Brings up the isolated QA stack (plan 408): frontend 4205, backend 3005, evidence server 4206.

.DESCRIPTION
  - writes src/environments/environment.slot.ts from environment.local.ts with apiUrl/authApiUrl = '' (same
    origin) and autoLoginGuest = false. ng serve proxies /api -> :3005 and /qa-evidence -> :4206, so the page
    only talks to :4205 (Cowork's browser blocks cross-port calls with ERR_BLOCKED_BY_CLIENT). Run this from
    the main folder or the QA checkout, not from a wt-N slot, whose own environment.slot.ts it would overwrite
  - after start, waits until the evidence server is signed in as QA_USER; a failed sign-in is a FAIL
  - refuses when a QA port is held by something that is not a dev server; a leftover dev server is stopped
  - starts the three servers detached (they outlive this script and a scheduled task), PIDs in .claude/.qa-pids
  - waits for each port and prints one "QA: <name> ok on <port>" / "QA: <name> FAIL - see <log>" line
  - idempotent: when all three are already up from a previous run it prints "QA: already up" and exits 0
  - writes .claude/.qa-env (local | remote) when it starts the backend; Code QA's api layer writes only on 'local'

  QA_USER / QA_PASS are read by the evidence server itself from .env or server/.env, never passed or printed.

.PARAMETER Env
  local (default) = NODE_ENV=development (MONGO_LOCAL_URI), like npm run dev:local.
  remote          = NODE_ENV=production (MONGO_URI).

.PARAMETER Status
  Print the three port states and the last 5 log lines of each service, then exit.

.PARAMETER Build
  Run ng build -c slot once before starting, so the first browser load is fast.
#>
param(
  [ValidateSet('local', 'remote')] [string] $Env = 'local',
  [switch] $Status,
  [switch] $Build,
  [string] $Root = ''
)

$ErrorActionPreference = 'Stop'
if (-not $Root) { $Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path }
$claudeDir = Join-Path $Root '.claude'
$pidFile = Join-Path $claudeDir '.qa-pids'
New-Item -ItemType Directory -Force -Path $claudeDir | Out-Null

$services = @(
  [pscustomobject]@{ Name = 'backend';  Port = 3005; Log = (Join-Path $claudeDir 'qa-backend.log');  Wait = 90 },
  [pscustomobject]@{ Name = 'frontend'; Port = 4205; Log = (Join-Path $claudeDir 'qa-frontend.log'); Wait = 180 },
  [pscustomobject]@{ Name = 'evidence'; Port = 4206; Log = (Join-Path $claudeDir 'qa-evidence.log'); Wait = 30 }
)
$devServer = '\b(node|nodemon|npm|npx|ng|vite|tsx|ts-node)(\.exe|\.cmd|\.js)?\b'

function Get-PortOwner([int] $port) {
  $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($c) { return [int] $c.OwningProcess }
  return $null
}

function Get-Proc([int] $procId) {
  Get-CimInstance Win32_Process -Filter "ProcessId=$procId" -ErrorAction SilentlyContinue
}

function Read-QaPids {
  if (-not (Test-Path $pidFile)) { return @() }
  try { return @((Get-Content $pidFile -Raw | ConvertFrom-Json).pids | ForEach-Object { [int] $_ }) } catch { return @() }
}

function Test-OursOrChild([int] $procId, [int[]] $roots) {
  $cur = $procId
  for ($i = 0; $cur -and $i -lt 12; $i++) {
    if ($roots -contains $cur) { return $true }
    $p = Get-Proc $cur
    if (-not $p) { return $false }
    $cur = [int] $p.ParentProcessId
  }
  return $false
}

# free | ours | stale (leftover dev server) | foreign — mirrors portState in scripts/lib/slot-procs.mjs
function Get-PortState([int] $port, [int[]] $recorded) {
  $owner = Get-PortOwner $port
  if (-not $owner) { return [pscustomobject]@{ State = 'free'; Pid = $null; Cmd = '' } }
  if ($recorded.Count -and (Test-OursOrChild $owner $recorded)) { return [pscustomobject]@{ State = 'ours'; Pid = $owner; Cmd = '' } }
  $p = Get-Proc $owner
  $cmd = if ($p -and $p.CommandLine) { $p.CommandLine } else { '' }
  if (-not $cmd -or $cmd -match $devServer) { return [pscustomobject]@{ State = 'stale'; Pid = $owner; Cmd = $cmd } }
  return [pscustomobject]@{ State = 'foreign'; Pid = $owner; Cmd = $cmd }
}

# taskkill writes to stderr for an already-gone PID; under 'Stop' PowerShell 5.1 would throw on it.
function Stop-Tree([int] $procId) {
  $ErrorActionPreference = 'Continue'
  & taskkill.exe /PID $procId /T /F *> $null
}

function Show-Tail([string] $file, [int] $n) {
  if (Test-Path $file) { Get-Content $file -Tail $n | ForEach-Object { "    $_" } } else { '    (no log yet)' }
}

# Starts a hidden cmd.exe in its own console, so it outlives this script and Ctrl+C in the caller's
# window. cmd.exe sets the env and redirects to the log; stdin must be NUL - without it ng serve
# stalls at "Building..." forever. (Not Win32_Process.Create: WMI-spawned processes fall under
# WmiPrvSE's memory quota and ng serve never finishes building.)
function Start-Detached([string] $dir, [string] $cmdLine, [string] $log) {
  $inner = "$cmdLine < NUL > `"$log`" 2>&1"
  $p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/d', '/c', "`"$inner`"" -WorkingDirectory $dir -WindowStyle Hidden -PassThru
  return [int] $p.Id
}

$recorded = Read-QaPids

# --- -Status ---------------------------------------------------------------------
if ($Status) {
  foreach ($s in $services) {
    $st = Get-PortState $s.Port $recorded
    $who = if ($st.Pid) { " (PID $($st.Pid))" } else { '' }
    Write-Output "QA: $($s.Name) port $($s.Port) $($st.State)$who"
    Show-Tail $s.Log 5
  }
  exit 0
}

# --- already up? -------------------------------------------------------------------
$states = @{}
foreach ($s in $services) { $states[$s.Name] = Get-PortState $s.Port $recorded }
if (@($services | Where-Object { $states[$_.Name].State -eq 'ours' }).Count -eq $services.Count) {
  Write-Output 'QA: already up'
  Write-Output 'QA ready -> http://localhost:4205 | evidence http://localhost:4205/qa-evidence/health'
  exit 0
}

# --- refuse foreign holders, clear leftovers -----------------------------------------
$foreign = @($services | Where-Object { $states[$_.Name].State -eq 'foreign' })
if ($foreign.Count) {
  foreach ($s in $foreign) {
    $st = $states[$s.Name]
    $short = if ($st.Cmd.Length -gt 80) { $st.Cmd.Substring(0, 80) } else { $st.Cmd }
    Write-Output "QA: port $($s.Port) is held by PID $($st.Pid), not a dev server ($short) - free it and re-run"
  }
  exit 1
}
foreach ($procId in $recorded) { Stop-Tree $procId }
foreach ($s in $services) {
  $st = Get-PortState $s.Port @()
  if ($st.State -eq 'stale') {
    Write-Output "QA: stopping leftover PID $($st.Pid) on port $($s.Port)"
    Stop-Tree $st.Pid
  }
}
if (Test-Path $pidFile) { Remove-Item $pidFile -Force }

# --- environment.slot.ts -> same origin, no guest auto-login ---------------------------
# The page calls /api on :4205 and ng serve proxies it to :3005. No auto guest: a fresh browser must be
# signed out, or the agent would test as «Guest Admin» without noticing.
$envLocal = Join-Path $Root 'src\environments\environment.local.ts'
$envSlot = Join-Path $Root 'src\environments\environment.slot.ts'
$text = [IO.File]::ReadAllText($envLocal)
$text = [regex]::Replace($text, "(?m)^(\s*(?:apiUrl|authApiUrl):[^\n]*?)'http://localhost:\d+'", { param($m) "$($m.Groups[1].Value)''" })
$text = [regex]::Replace($text, '(?m)^(\s*autoLoginGuest:\s*)true', '${1}false')
[IO.File]::WriteAllText($envSlot, $text, (New-Object Text.UTF8Encoding($false)))

# --- ng serve proxy: /api -> backend, /qa-evidence -> evidence server ------------------
$proxyConf = Join-Path $claudeDir 'qa-proxy.conf.json'
$proxyJson = @'
{
  "/api": { "target": "http://localhost:3005", "secure": false },
  "/qa-evidence": { "target": "http://localhost:4206", "secure": false, "pathRewrite": { "^/qa-evidence": "" } }
}
'@
[IO.File]::WriteAllText($proxyConf, $proxyJson, (New-Object Text.UTF8Encoding($false)))

if ($Build) {
  Write-Output 'QA: ng build -c slot ...'
  Push-Location $Root
  try { $ErrorActionPreference = 'Continue'; & npx.cmd ng build -c slot *> (Join-Path $claudeDir 'qa-build.log') } finally { $ErrorActionPreference = 'Stop'; Pop-Location }
  if ($LASTEXITCODE -ne 0) { Write-Output "QA: build FAIL - see $(Join-Path $claudeDir 'qa-build.log')"; exit 1 }
}

# --- shared schemas: server/generated is gitignored, so a fresh or freshly pulled checkout needs it ---
$schemasLog = Join-Path $claudeDir 'qa-schemas.log'
Push-Location $Root
# npm writes warnings to stderr; under 'Stop' PowerShell 5.1 would throw on them.
try { $ErrorActionPreference = 'Continue'; & npm.cmd run build:schemas *> $schemasLog } finally { $ErrorActionPreference = 'Stop'; Pop-Location }
if ($LASTEXITCODE -ne 0) { Write-Output "QA: build:schemas FAIL - see $schemasLog"; exit 1 }

# --- start ---------------------------------------------------------------------------
$nodeEnv = if ($Env -eq 'remote') { 'production' } else { 'development' }
# Plan 414: Code QA's api layer writes test records only when this reads 'local'.
Set-Content -Path (Join-Path $claudeDir '.qa-env') -Value $Env -Encoding ASCII
$pids = @()
$pids += Start-Detached (Join-Path $Root 'server') "set `"PORT=3005`"&& set `"NODE_ENV=$nodeEnv`"&& set `"ALLOWED_ORIGIN=http://localhost:4205,http://localhost:4206`"&& node index.js" $services[0].Log
$pids += Start-Detached $Root "npx ng serve -c slot --port 4205 --proxy-config `"$proxyConf`"" $services[1].Log
$pids += Start-Detached $Root "set `"QA_PORT=4206`"&& set `"QA_APP=http://localhost:4205`"&& set `"QA_API=http://localhost:3005`"&& node scripts\qa\evidence-server.mjs" $services[2].Log
@{ pids = $pids } | ConvertTo-Json | Set-Content -Path $pidFile -Encoding UTF8

# --- wait -------------------------------------------------------------------------------
$failed = $false
foreach ($s in $services) {
  $end = (Get-Date).AddSeconds($s.Wait)
  $up = $false
  while ((Get-Date) -lt $end) {
    if (Get-PortOwner $s.Port) { $up = $true; break }
    Start-Sleep -Seconds 1
  }
  if ($up) { Write-Output "QA: $($s.Name) ok on $($s.Port)" }
  else { Write-Output "QA: $($s.Name) FAIL - see $($s.Log)"; $failed = $true }
}
if ($failed) { exit 1 }

# --- QA user signed in? (the evidence server retries while the backend boots) ------------
$signedIn = $false
$end = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $end) {
  try { if ((Invoke-RestMethod -Uri 'http://127.0.0.1:4206/health' -TimeoutSec 5).loggedIn) { $signedIn = $true; break } } catch { }
  Start-Sleep -Seconds 2
}
if (-not $signedIn) { Write-Output "QA: QA user sign-in FAIL - check QA_USER / QA_PASS in server/.env; see $($services[2].Log)"; exit 1 }
Write-Output 'QA: QA user signed in'
Write-Output 'QA ready -> http://localhost:4205 | evidence http://localhost:4205/qa-evidence/health'
exit 0
