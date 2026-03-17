#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─── Config ───────────────────────────────────────────────────────────────────
$Repo        = "dadangdut33/simple-prayertime-reminder"
$FrontendDir = "frontend"
$BinaryName  = "simple-prayertime-reminder"
$InstallDir  = (go env GOPATH) + "\bin"
$TmpDir      = Join-Path $env:TEMP ([System.IO.Path]::GetRandomFileName())
# ──────────────────────────────────────────────────────────────────────────────

function Log     { param($msg) Write-Host "==> $msg" -ForegroundColor Cyan }
function Success { param($msg) Write-Host "v  $msg"  -ForegroundColor Green }
function Fatal   {
  param($msg)
  Write-Host "X  $msg" -ForegroundColor Red
  if (Test-Path $TmpDir) { Remove-Item -Recurse -Force $TmpDir }
  exit 1
}

# ─── Dependency checks ────────────────────────────────────────────────────────
Log "Checking dependencies..."

if (-not (Get-Command go   -ErrorAction SilentlyContinue)) { Fatal "go is not installed. Visit https://go.dev/dl/" }
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { Fatal "pnpm is not installed. Visit https://pnpm.io/installation" }
if (-not (Get-Command git  -ErrorAction SilentlyContinue)) { Fatal "git is not installed." }

$goVersion = [Version]((go version) -replace "go version go(\S+).*", '$1')
if ($goVersion -lt [Version]"1.21") { Fatal "Go 1.21+ required, found $goVersion" }

Success "Dependencies OK"

# ─── Clone repo ───────────────────────────────────────────────────────────────
Log "Cloning repository..."
git clone --depth=1 "https://github.com/$Repo.git" $TmpDir
if ($LASTEXITCODE -ne 0) { Fatal "git clone failed" }
Success "Repository cloned"

# ─── Build frontend ───────────────────────────────────────────────────────────
Push-Location (Join-Path $TmpDir $FrontendDir)
try {
  Log "Installing frontend dependencies..."
  pnpm install --frozen-lockfile
  if ($LASTEXITCODE -ne 0) { Fatal "pnpm install failed" }
  Success "Frontend dependencies installed"

  Log "Building frontend..."
  pnpm run build
  if ($LASTEXITCODE -ne 0) { Fatal "pnpm build failed" }
  Success "Frontend built"
} finally {
  Pop-Location
}

# ─── Install Go binary ────────────────────────────────────────────────────────
Log "Installing Go binary..."
Push-Location $TmpDir
try {
  go install .
  if ($LASTEXITCODE -ne 0) { Fatal "go install failed" }
} finally {
  Pop-Location
}
Success "Binary installed to $InstallDir\$BinaryName"

# ─── Cleanup ──────────────────────────────────────────────────────────────────
Remove-Item -Recurse -Force $TmpDir

# ─── PATH check ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green

$pathDirs = $env:PATH -split ";"
if ($pathDirs -notcontains $InstallDir) {
  Write-Host "Warning: $InstallDir is not in your PATH." -ForegroundColor Yellow
  Write-Host "Add it permanently by running:"
  Write-Host "  [Environment]::SetEnvironmentVariable('PATH', `$env:PATH + ';$InstallDir', 'User')" -ForegroundColor Cyan
} else {
  Write-Host "Run: $BinaryName"
}