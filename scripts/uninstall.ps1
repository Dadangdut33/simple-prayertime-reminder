#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─── Config ───────────────────────────────────────────────────────────────────
$BinaryName = "simple-prayertime-reminder"
$InstallDir = (go env GOPATH) + "\bin"
# ──────────────────────────────────────────────────────────────────────────────

function Log   { param($msg) Write-Host "==> $msg" -ForegroundColor Cyan }
function Success { param($msg) Write-Host "v  $msg" -ForegroundColor Green }
function Fatal { param($msg) Write-Host "X  $msg" -ForegroundColor Red; exit 1 }

$BinaryPath = Join-Path $InstallDir "$BinaryName.exe"

Log "Uninstalling $BinaryName..."

if (-not (Test-Path $BinaryPath)) {
  Fatal "Binary not found at $BinaryPath. Is it installed?"
}

Remove-Item -Force $BinaryPath
Success "Removed $BinaryPath"

Write-Host ""
Write-Host "Uninstall complete!" -ForegroundColor Green