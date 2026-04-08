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
    # The Stop hook is a safety net - only fires when issues are detected.
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

# --- Step 1: Check for session-handoff.md ---
# Look for the most recent unified session-handoff file
$handoffFiles = Get-ChildItem -Path ".claude/sessions/*/session-handoff.md" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if ($handoffFiles) {
    $handoffPath = $handoffFiles.FullName
    $sessionDir = Split-Path (Split-Path $handoffPath)
    $sessionId = Split-Path $sessionDir -Leaf
    $handoffContent = Get-Content $handoffPath -Raw

    # Parse for missed or partial criteria
    $missedLines = @()
    foreach ($line in (Get-Content $handoffPath)) {
        if ($line -match [char]0x274C -or $line -match [char]0x26A0 -or $line -match "Missed" -or $line -match "Partial") {
            # Check if this is in the evaluation table (contains | separator)
            if ($line -match "\|") {
                $missedLines += $line.Trim()
            }
        }
    }

    if ($missedLines.Count -gt 0) {
        Write-Host "[auto-reflect] Session $sessionId has $($missedLines.Count) issue(s) - triggering targeted reflection"

        # Build context
        $missedSummary = $missedLines -join "`n"
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $contextContent = @"
# Session Reflection Context
Generated: $timestamp
Session: $sessionId

## Issues Found in session-handoff.md
$missedSummary

## Trigger
Auto-reflect triggered by session evaluation issues (missed or partial criteria)
"@
        $contextContent | Out-File -FilePath $ContextFile -Encoding utf8

        # Invoke targeted reflection
        $prompt = "Session $sessionId ended with issues: $missedSummary. Read .claude/commands/reflect.md and execute the AUTO MODE section. Find ONE low-risk workflow improvement that would help prevent this type of issue. Apply if safe, log result."
        claude --print $prompt --max-turns 10

        Write-Host "[auto-reflect] Targeted reflection cycle complete."
        exit 0
    }
    else {
        # All criteria passed
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "$timestamp`tsession-handoff`t$sessionId`tnone`tskipped`tAll criteria passed" | Out-File -FilePath $LogFile -Append -Encoding utf8
        Write-Host "[auto-reflect] Session $sessionId completed successfully. No reflection needed."
        exit 0
    }
}

# --- Step 2: Legacy fallback (no session-handoff found) ---
# Original behavior: check for git conflict markers

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
        Write-Host '[auto-reflect] Failure signal detected (conflict markers) - triggering reflection'
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
