# auto-reflect.ps1
# Bridge script: fires after every Claude Code task via Stop hook (safety net)
# Also invoked directly by the agent after a correction cycle
# Invokes /reflect in AUTO mode using Claude Code headless execution
#
# NOTE: pwsh (PowerShell 7) is not installed on this machine.
# This script runs under powershell (Windows PowerShell 5.1).
# Hook command in settings.json: powershell -NoProfile -File .claude/reflect/auto-reflect.ps1

param(
    [string]$Mode = "failure-only"
    # "always" | "failure-only"
    # Default is "failure-only" because the agent handles correction cycles directly (inline AUTO MODE).
    # The Stop hook is a safety net - only fires when git conflict markers are detected.
)

$ErrorActionPreference = "Stop"
$ReflectDir = ".claude/reflect"
$LogFile = "$ReflectDir/auto-reflection-log.tsv"
$ContextFile = "$ReflectDir/last-session-context.md"

# Ensure reflect directory exists
if (-not (Test-Path $ReflectDir)) {
    New-Item -ItemType Directory -Path $ReflectDir -Force | Out-Null
}

# Ensure log file exists with header
if (-not (Test-Path $LogFile)) {
    "timestamp`tmode`ttarget`tchange`tresult`treason" | Out-File -FilePath $LogFile -Encoding utf8
}

# Decide whether to reflect
$shouldReflect = $false

if ($Mode -eq "always") {
    $shouldReflect = $true
}
elseif ($Mode -eq "failure-only") {
    # Check git status for unresolved conflict markers
    $gitStatus = git status --short 2>&1
    $hasFailureSignal = ($gitStatus -match "UU|AA|DD") -or ($LASTEXITCODE -ne 0)
    if ($hasFailureSignal) {
        $shouldReflect = $true
        Write-Host '[auto-reflect] Failure signal detected - triggering reflection'
    }
}

if (-not $shouldReflect) {
    Write-Host '[auto-reflect] No reflection needed this cycle. Exiting.'
    exit 0
}

# Save minimal session context for reflect.md to read
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$recentCommits = git log --oneline -5 2>&1
$contextContent = "# Last Session Context`nGenerated: $timestamp`n`n## Recent Git Log`n$recentCommits`n`n## Trigger Mode`n$Mode"
$contextContent | Out-File -FilePath $ContextFile -Encoding utf8

# Invoke Claude Code in headless mode with auto-reflect prompt
# --print = non-interactive, single-pass output
# --max-turns limits runaway loops
Write-Host '[auto-reflect] Triggering AUTO reflect cycle...'

$prompt = "Read .claude/commands/reflect.md and execute the AUTO MODE section at the top. Do not run the manual phases below the separator. Session context is available at .claude/reflect/last-session-context.md"

claude --print $prompt --max-turns 10

Write-Host '[auto-reflect] Cycle complete.'
