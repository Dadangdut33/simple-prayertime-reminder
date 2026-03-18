#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─── Config ───
$BinaryName = "simple-prayertime-reminder"
$InstallDir = (go env GOPATH) + "\bin"

function Log     { param($msg) Write-Host "==> $msg" -ForegroundColor Cyan }
function Success { param($msg) Write-Host "v  $msg"  -ForegroundColor Green }
function Fatal   { param($msg) Write-Host "X  $msg"  -ForegroundColor Red; exit 1 }

Log "Uninstalling $BinaryName..."

$Removed = $false

# ─── Binary ───
$BinaryPath = Join-Path $InstallDir "$BinaryName.exe"
if (Test-Path $BinaryPath) {
  Remove-Item -Force $BinaryPath
  Success "Removed binary: $BinaryPath"
  $Removed = $true
} else {
  Log "Binary not found at $BinaryPath, skipping."
}

# ─── Start Menu shortcut ───
$ShortcutPath = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\$BinaryName.lnk"
if (Test-Path $ShortcutPath) {
  Remove-Item -Force $ShortcutPath
  Success "Removed Start Menu shortcut: $ShortcutPath"
  $Removed = $true
} else {
  Log "Start Menu shortcut not found at $ShortcutPath, skipping."
}

# ─── Icon ───
$IconDir = Join-Path $env:LOCALAPPDATA $BinaryName
if (Test-Path $IconDir) {
  Remove-Item -Recurse -Force $IconDir
  Success "Removed icon directory: $IconDir"
  $Removed = $true
} else {
  Log "Icon directory not found at $IconDir, skipping."
}

# ─── Nothing found ───
if (-not $Removed) {
  Fatal "Nothing to uninstall — no files were found."
}

Write-Host ""
Write-Host "Uninstall complete!" -ForegroundColor Green