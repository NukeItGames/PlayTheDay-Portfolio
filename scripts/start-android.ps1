param(
    [string]$DeviceName = 'PlayTheDay_Pixel_8',
    [int]$Port = 8082
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

# Read saved user settings so an already-open VS Code also sees the SDK.
$sdkPath = [Environment]::GetEnvironmentVariable('ANDROID_HOME', 'User')
if (-not $sdkPath) { $sdkPath = $env:ANDROID_HOME }
if (-not $sdkPath) { $sdkPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$env:ANDROID_HOME = $sdkPath
$env:ANDROID_SDK_ROOT = $sdkPath
$javaPath = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User')
if ($javaPath) { $env:JAVA_HOME = $javaPath }
$env:Path = "$sdkPath\platform-tools;$sdkPath\emulator;$env:Path"
$adb = Join-Path $sdkPath 'platform-tools\adb.exe'
$emulator = Join-Path $sdkPath 'emulator\emulator.exe'
if (-not (Test-Path $adb) -or -not (Test-Path $emulator)) {
    throw 'Android SDK tools are missing. See README.md: Android on Windows / VS Code.'
}
if ((& $emulator -list-avds) -notcontains $DeviceName) {
    throw "Android virtual device '$DeviceName' was not found. Create it in Android Studio Device Manager."
}

& $adb start-server
function Find-TargetDevice {
    foreach ($line in (& $adb devices)) {
        if ($line -match '^(emulator-\d+)\s+device$') {
            $serial = $Matches[1]
            try { $name = & $adb -s $serial emu avd name 2>$null }
            catch { continue }
            if ($name -contains $DeviceName) { return $serial }
        }
    }
}
$serial = Find-TargetDevice
if (-not $serial) {
    Write-Host "Starting $DeviceName..."
    # This is the visible phone window requested by the developer.
    Start-Process -FilePath $emulator -ArgumentList @('-avd', $DeviceName) -WindowStyle Normal
}
$deadline = (Get-Date).AddMinutes(3)
do {
    if (-not $serial) { $serial = Find-TargetDevice }
    if ($serial) {
        try {
            $booted = (& $adb -s $serial shell getprop sys.boot_completed 2>$null) -join ''
            if ($booted.Trim() -eq '1') { break }
        } catch {
            # ADB can disconnect briefly while Android is starting.
            $serial = $null
        }
    }
    if ((Get-Date) -gt $deadline) { throw 'Emulator did not boot within 3 minutes. Check its window and try again.' }
    Start-Sleep -Seconds 2
} while ($true)

$env:ANDROID_SERIAL = $serial
# On Windows, localhost may otherwise bind only to ::1 while ADB forwards IPv4.
$env:NODE_OPTIONS = "$env:NODE_OPTIONS --dns-result-order=ipv4first".Trim()
& $adb -s $serial reverse "tcp:$Port" "tcp:$Port"
if ($LASTEXITCODE -ne 0) { throw 'Could not connect the emulator to Metro.' }
Write-Host 'Starting PlayTheDay in Expo Go. Keep this terminal open; Ctrl+C stops Metro.'
& npx.cmd expo start --go --android --localhost --port $Port
exit $LASTEXITCODE
