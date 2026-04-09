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
$OpenDir = "$ReflectDir/open"
$SkipFile = "$ReflectDir/.skip"

# Ensure reflect directory and open subdirectory exist
if (-not (Test-Path $ReflectDir)) {
    New-Item -ItemType Directory -Path $ReflectDir -Force | Out-Null
}
if (-not (Test-Path $OpenDir)) {
    New-Item -ItemType Directory -Path $OpenDir -Force | Out-Null
}

# Ensure log file exists with header
if (-not (Test-Path $LogFile)) {
    "timestamp`tmode`ttarget`tchange`tresult`treason" | Out-File -FilePath $LogFile -Encoding utf8
}

# --- Helper: Run claude --print with watchdog kill switch ---
function Invoke-ClaudeWithWatchdog {
    param(
        [string]$Prompt,
        [string]$SessionId,
        [string]$ReflectFilePath
    )

    # Clean any stale .skip file before starting
    if (Test-Path $SkipFile) { Remove-Item $SkipFile -Force }

    Write-Host "[auto-reflect] Running improvement cycle..."

    # Launch claude --print as a background job
    $job = Start-Job -ScriptBlock {
        param($p)
        claude --print $p --max-turns 10 2>&1
    } -ArgumentList $Prompt

    # Watchdog loop: poll every 2 seconds for .skip file or job completion
    while ($job.State -eq 'Running') {
        if (Test-Path $SkipFile) {
            Write-Host "[auto-reflect] .skip detected - killing subprocess"
            Stop-Job $job -Force
            Remove-Job $job -Force

            # Log interruption
            $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            "$ts`tauto`t$SessionId`tinterrupted`tskipped`tinterrupted by user" |
                Out-File -FilePath $LogFile -Append -Encoding utf8

            # Update reflect file status to interrupted
            if ($ReflectFilePath -and (Test-Path $ReflectFilePath)) {
                (Get-Content $ReflectFilePath -Raw) -replace 'status: open', 'status: interrupted' |
                    Out-File -FilePath $ReflectFilePath -Encoding utf8
            }

            # Self-clean the .skip file
            Remove-Item $SkipFile -Force
            Write-Host "[auto-reflect] Interrupted. Cleaned up."
            return $null
        }
        Start-Sleep -Seconds 2
    }

    # Job completed normally - retrieve and display output
    $output = Receive-Job $job
    Remove-Job $job
    return $output
}

# --- Helper: Print the reflect file diff/discard sections ---
function Show-ReflectResult {
    param([string]$ReflectFilePath)

    if (-not $ReflectFilePath -or -not (Test-Path $ReflectFilePath)) { return }

    $content = Get-Content $ReflectFilePath -Raw

    # Show Action Taken
    if ($content -match '## Action Taken\r?\n(.+?)(\r?\n##|\z)') {
        $action = $Matches[1].Trim()
        Write-Host "[auto-reflect] Action: $action"
    }

    # Show Diff section if present and not N/A
    if ($content -match '### Diff\r?\n```diff\r?\n([\s\S]*?)```') {
        $diff = $Matches[1].Trim()
        if ($diff -and $diff -ne 'N/A') {
            Write-Host ""
            Write-Host "=== REFLECTION DIFF ==="
            Write-Host $diff
            Write-Host "=== END DIFF ==="
            Write-Host ""
        }
    }

    # Show Discard Reason if present and not N/A
    if ($content -match '### Discard Reason\r?\n(.+?)(\r?\n##|\r?\n###|\z)') {
        $reason = $Matches[1].Trim()
        if ($reason -and $reason -ne 'N/A') {
            Write-Host "[auto-reflect] Discard reason: $reason"
        }
    }
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

    # Guard: only reflect once per session handoff - stamp file prevents repeat triggers
    $stampFile = "$ReflectDir/reflected-$sessionId.stamp"
    if (Test-Path $stampFile) {
        Write-Host "[auto-reflect] Already reflected on session $sessionId. Skipping."
        exit 0
    }

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
        Write-Host "[auto-reflect] Session $sessionId - $($missedLines.Count) issue(s) found"

        # Build context
        $missedSummary = $missedLines -join "`n"
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

        # Write per-session .reflect.md file to open/ directory
        $reflectFile = "$OpenDir/$sessionId.reflect.md"
        $fence = '```'
        $reflectContent = @"
---
status: open
session-id: $sessionId
created: $timestamp
resolved: null
trigger: session-handoff
---

# Reflection: $sessionId

## Issues Found
$missedSummary

## Analysis
Pending auto-reflect analysis.

## Action Taken
Pending.

### Change Details
N/A

### Diff
$($fence)diff
N/A
$fence

### Discard Reason
N/A
"@
        $reflectContent | Out-File -FilePath $reflectFile -Encoding utf8
        Write-Host "[auto-reflect] Created $reflectFile"

        # Also write legacy context file for backward compatibility
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

        # Stamp first so re-triggers during the claude run don't cause a loop
        Get-Date -Format "yyyy-MM-dd HH:mm:ss" | Out-File -FilePath $stampFile -Encoding utf8

        # Invoke targeted reflection with watchdog
        $prompt = "Session $sessionId ended with issues. Read .claude/commands/reflect.md and execute the AUTO MODE section. Session context is in .claude/reflect/open/$sessionId.reflect.md - update that file with your findings and set status to resolved when done."

        $output = Invoke-ClaudeWithWatchdog -Prompt $prompt -SessionId $sessionId -ReflectFilePath $reflectFile

        if ($null -ne $output) {
            Write-Host $output
            # Show the structured result from the reflect file
            Show-ReflectResult -ReflectFilePath $reflectFile
            Write-Host "[auto-reflect] Targeted reflection cycle complete."
        }
        exit 0
    }
    else {
        # All criteria passed - stamp so we don't re-check this session
        Get-Date -Format "yyyy-MM-dd HH:mm:ss" | Out-File -FilePath $stampFile -Encoding utf8
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
$legacySessionId = "legacy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# Write per-session .reflect.md file to open/ directory
$reflectFile = "$OpenDir/$legacySessionId.reflect.md"
$fence = '```'
$reflectContent = @"
---
status: open
session-id: $legacySessionId
created: $timestamp
resolved: null
trigger: legacy-conflict
---

# Reflection: $legacySessionId

## Issues Found
Git conflict markers detected in working tree.

## Recent Commits
$recentCommits

## Analysis
Pending auto-reflect analysis.

## Action Taken
Pending.

### Change Details
N/A

### Diff
$($fence)diff
N/A
$fence

### Discard Reason
N/A
"@
$reflectContent | Out-File -FilePath $reflectFile -Encoding utf8
Write-Host "[auto-reflect] Legacy fallback - created $reflectFile"

# Also write legacy context file for backward compatibility
$contextContent = "# Last Session Context`nGenerated: $timestamp`n`n## Recent Git Log`n$recentCommits`n`n## Trigger Mode`n$Mode"
$contextContent | Out-File -FilePath $ContextFile -Encoding utf8

# Invoke Claude Code in headless mode with auto-reflect prompt + watchdog
Write-Host '[auto-reflect] Triggering AUTO reflect cycle...'

$prompt = "Read .claude/commands/reflect.md and execute the AUTO MODE section. Session context is in .claude/reflect/open/$legacySessionId.reflect.md - update that file with your findings and set status to resolved when done."

$output = Invoke-ClaudeWithWatchdog -Prompt $prompt -SessionId $legacySessionId -ReflectFilePath $reflectFile

if ($null -ne $output) {
    Write-Host $output
    Show-ReflectResult -ReflectFilePath $reflectFile
    Write-Host '[auto-reflect] Cycle complete.'
}
