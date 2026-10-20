<#
.SYNOPSIS
  Registers (or removes) the two Windows scheduled tasks that own the nightly QA servers (plan 408):
  "FoodVibe QA up" (default 00:00: servers, then Code QA until 02:40 - plan 413) and "FoodVibe QA down"
  (default 07:30), daily, wake the PC, catch up when missed, allowed on battery, run only while the user is
  logged on. The up task may run 3 hours (Code QA); the down task 30 minutes.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\qa\qa-schedule.ps1 -Root C:\dev\foodVibe-qa
  powershell -ExecutionPolicy Bypass -File scripts\qa\qa-schedule.ps1 -Unregister
#>
param(
  [string] $Root = '',
  [string] $Up = '00:00',
  [string] $Down = '07:30',
  [switch] $Unregister
)

$ErrorActionPreference = 'Stop'
$names = 'FoodVibe QA up', 'FoodVibe QA down'

if ($Unregister) {
  foreach ($n in $names) {
    if (Get-ScheduledTask -TaskName $n -ErrorAction SilentlyContinue) {
      Unregister-ScheduledTask -TaskName $n -Confirm:$false
      Write-Output "QA: removed task '$n'"
    } else {
      Write-Output "QA: task '$n' was not registered"
    }
  }
  exit 0
}

if (-not $Root) { throw 'pass -Root <path of the dedicated QA checkout>' }
$Root = (Resolve-Path $Root).Path
if (-not (Test-Path (Join-Path $Root 'scripts\qa\qa-nightly-up.ps1'))) { throw "no scripts\qa\qa-nightly-up.ps1 under $Root" }

$user = "$env:USERDOMAIN\$env:USERNAME"
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
function New-QaSettings([int] $minutes) {
  New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes $minutes) -MultipleInstances IgnoreNew
}

foreach ($t in @(@($names[0], 'qa-nightly-up.ps1', $Up, 180), @($names[1], 'qa-nightly-down.ps1', $Down, 30))) {
  $settings = New-QaSettings $t[3]
  $script = Join-Path $Root "scripts\qa\$($t[1])"
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' -WorkingDirectory $Root `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`" -Root `"$Root`""
  $trigger = New-ScheduledTaskTrigger -Daily -At $t[2]
  Register-ScheduledTask -TaskName $t[0] -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
    -Description "FoodVibe nightly QA (plan 408) - $Root" -Force | Out-Null
}

foreach ($n in $names) {
  $info = Get-ScheduledTaskInfo -TaskName $n
  Write-Output "QA: task '$n' next run $($info.NextRunTime.ToString('yyyy-MM-dd HH:mm'))"
}
exit 0
