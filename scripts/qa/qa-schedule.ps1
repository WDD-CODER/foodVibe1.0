<#
.SYNOPSIS
  Registers (or removes) the two Windows scheduled tasks that own the nightly QA servers (plan 408):
  "FoodVibe QA up" (default 02:45) and "FoodVibe QA down" (default 07:00), daily, wake the PC, catch up
  when missed, allowed on battery, run only while the user is logged on.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\qa\qa-schedule.ps1 -Root C:\dev\foodVibe-qa
  powershell -ExecutionPolicy Bypass -File scripts\qa\qa-schedule.ps1 -Unregister
#>
param(
  [string] $Root = '',
  [string] $Up = '02:45',
  [string] $Down = '07:00',
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
$settings = New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew

foreach ($t in @(@($names[0], 'qa-nightly-up.ps1', $Up), @($names[1], 'qa-nightly-down.ps1', $Down))) {
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
