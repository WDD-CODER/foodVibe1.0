# tool-failure-hook.ps1
# PostToolUse hook — logs tool failures to failure-log.tsv
# Zero CPU impact: no Claude invocation, just a file append.

$ErrorActionPreference = "SilentlyContinue"
$LogFile = ".claude/reflect/failure-log.tsv"

# Read JSON payload from stdin
$raw = [Console]::In.ReadToEnd()
if (-not $raw) { exit 0 }

try {
    $payload = $raw | ConvertFrom-Json
} catch {
    exit 0
}

$toolName = $payload.tool_name
if (-not $toolName) { exit 0 }

# Skip non-execution tools (these don't produce actionable failures)
$skipTools = @("Read", "Glob", "Grep", "Skill", "ToolSearch", "Agent", "SendMessage",
               "TaskCreate", "TaskUpdate", "TaskGet", "TaskList", "TaskStop", "TaskOutput",
               "EnterPlanMode", "ExitPlanMode", "AskUserQuestion", "TeamCreate", "TeamDelete")
if ($skipTools -contains $toolName) { exit 0 }

# Extract tool response — handle both field names
$response = ""
if ($payload.tool_response) { $response = "$($payload.tool_response)" }
elseif ($payload.tool_output) { $response = "$($payload.tool_output)" }
if (-not $response) { exit 0 }

# Detect failure signals
$failurePatterns = @(
    "Error:", "error:", "FAILED", "failed",
    "Exception", "ENOENT", "Cannot find",
    "npm ERR", "NG0", "Build failed",
    "SyntaxError", "TypeError", "ReferenceError",
    "EPERM", "EACCES", "command not found",
    "fatal:", "Permission denied"
)

$isFailure = $false
foreach ($pattern in $failurePatterns) {
    if ($response -like "*$pattern*") {
        $isFailure = $true
        break
    }
}

if (-not $isFailure) { exit 0 }

# Build input summary
$inputSummary = ""
if ($payload.tool_input) {
    if ($payload.tool_input.command) {
        $inputSummary = $payload.tool_input.command
    } elseif ($payload.tool_input.file_path) {
        $inputSummary = $payload.tool_input.file_path
    } else {
        $inputSummary = "$($payload.tool_input)" | Select-Object -First 1
    }
}
if ($inputSummary.Length -gt 80) { $inputSummary = $inputSummary.Substring(0, 80) }

# Build error snippet — first line that matches a failure pattern
$errorSnippet = ($response -split "`n" | Where-Object {
    $line = $_
    $failurePatterns | Where-Object { $line -like "*$_*" } | Select-Object -First 1
} | Select-Object -First 1)
if (-not $errorSnippet) { $errorSnippet = $response.Substring(0, [Math]::Min(120, $response.Length)) }
if ($errorSnippet.Length -gt 120) { $errorSnippet = $errorSnippet.Substring(0, 120) }

# Clean tabs from values to avoid TSV corruption
$inputSummary = $inputSummary -replace "`t", " "
$errorSnippet = $errorSnippet -replace "`t", " "

# Ensure log file exists with header
if (-not (Test-Path $LogFile)) {
    $dir = Split-Path $LogFile
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    "timestamp`ttool_name`tinput_summary`terror_snippet`tprocessed" | Out-File -FilePath $LogFile -Encoding utf8
}

# Append failure row
$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"$ts`t$toolName`t$inputSummary`t$errorSnippet`t" | Out-File -FilePath $LogFile -Append -Encoding utf8

exit 0
