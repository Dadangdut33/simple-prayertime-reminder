#Requires -Version 5.1
[CmdletBinding()]
param(
  [string]$Version = ""   # optional: pass a git tag, e.g. -Version v2.0.0
)

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

# Helper: compare two semantic version strings, returns true if $a >= $b
function SemVerGte {
  param([string]$a, [string]$b)
  $pa = $a -replace '^v','' -split '\.' | ForEach-Object { [int]$_ }
  $pb = $b -replace '^v','' -split '\.' | ForEach-Object { [int]$_ }
  for ($i = 0; $i -lt [Math]::Max($pa.Count, $pb.Count); $i++) {
    $va = if ($i -lt $pa.Count) { $pa[$i] } else { 0 }
    $vb = if ($i -lt $pb.Count) { $pb[$i] } else { 0 }
    if ($va -gt $vb) { return $true }
    if ($va -lt $vb) { return $false }
  }
  return $true  # equal
}

# ─── Resolve version ──────────────────────────────────────────────────────────
# Priority: -Version arg > interactive prompt (with tag list) > latest
if ($Version -eq "") {
  # Fetch and filter tags >= v2.0.0
  Write-Host "==> Fetching available versions..." -ForegroundColor Cyan
  try {
    $rawTags = git ls-remote --tags --refs "https://github.com/$Repo.git" 2>$null |
      ForEach-Object { ($_ -split '\s+')[1] -replace 'refs/tags/','' } |
      Where-Object { $_ -match '^v\d+\.\d+(\.\d+)?$' } |
      Where-Object { SemVerGte $_ "v2.0.0" } |
      Sort-Object { 
        $parts = ($_ -replace '^v','') -split '\.' | ForEach-Object { [int]$_ }
        # Pad to 3 parts for consistent sort
        while ($parts.Count -lt 3) { $parts += 0 }
        [version]("$($parts[0]).$($parts[1]).$($parts[2])")
      } |
      Select-Object -Last 20  # cap at 20 entries

    if (-not $rawTags) {
      Write-Host "  (No tags >= v2.0.0 found, will install latest)" -ForegroundColor Yellow
    } else {
      Write-Host ""
      Write-Host "  Available versions (v2.0.0 and above):" -ForegroundColor White
      foreach ($tag in $rawTags) {
        Write-Host "    * $tag" -ForegroundColor Cyan
      }
      Write-Host ""
    }
  } catch {
    Write-Host "  (Could not fetch tags: $_)" -ForegroundColor Yellow
  }

  Write-Host "?  Enter a version tag to install (e.g. v2.0.0), or press Enter for latest:" -ForegroundColor Yellow
  $input = Read-Host
  $Version = $input.Trim()
}

if ($Version -ne "") {
  Write-Host "   Installing version: $Version" -ForegroundColor White
} else {
  Write-Host "   Installing: latest" -ForegroundColor White
}

# ─── Dependency checks ────────────────────────────────────────────────────────
Log "Checking dependencies..."

if (-not (Get-Command go   -ErrorAction SilentlyContinue)) { Fatal "go is not installed. Visit https://go.dev/dl/" }
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { Fatal "pnpm is not installed. Visit https://pnpm.io/installation" }
if (-not (Get-Command git  -ErrorAction SilentlyContinue)) { Fatal "git is not installed." }

$goVersion = [Version]((go version) -replace "go version go(\S+).*", '$1')
if ($goVersion -lt [Version]"1.21") { Fatal "Go 1.21+ required, found $goVersion" }

# ─── Install wails3 if needed ─────────────────────────────────────────────────
if (-not (Get-Command wails3 -ErrorAction SilentlyContinue)) {
  Log "Installing wails3..."
  go install github.com/wailsapp/wails/v3/cmd/wails3@latest
  if ($LASTEXITCODE -ne 0) { Fatal "Failed to install wails3" }
  $env:PATH = "$InstallDir;$env:PATH"
}

Success "Dependencies OK"

# ─── Clone repo ───────────────────────────────────────────────────────────────
if ($Version -ne "") {
  Log "Cloning repository at tag $Version..."
  git clone --depth=1 --branch $Version "https://github.com/$Repo.git" $TmpDir
  if ($LASTEXITCODE -ne 0) { Fatal "Failed to clone tag '$Version'. Make sure it exists: https://github.com/$Repo/tags" }
} else {
  Log "Cloning repository (latest)..."
  git clone --depth=1 "https://github.com/$Repo.git" $TmpDir
  if ($LASTEXITCODE -ne 0) { Fatal "git clone failed" }
}
Success "Repository cloned"

# ─── Build app ────────────────────────────────────────────────────────────────
Log "Building app..."
Push-Location $TmpDir
try {
  wails3 build
  if ($LASTEXITCODE -ne 0) { Fatal "wails3 build failed" }
} finally {
  Pop-Location
}

$BinPath = Join-Path $TmpDir "bin\$BinaryName.exe"
if (-not (Test-Path $BinPath)) { Fatal "Build output not found at $BinPath" }

# ─── Install binary ───────────────────────────────────────────────────────────
Log "Installing binary..."
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$DestPath = Join-Path $InstallDir "$BinaryName.exe"
Remove-Item -Force $DestPath -ErrorAction SilentlyContinue
Copy-Item -Force $BinPath $DestPath

Success "Binary installed to $InstallDir\$BinaryName.exe"

# ─── Start Menu shortcut ──────────────────────────────────────────────────────
Log "Creating Start Menu shortcut..."

$StartMenuDir  = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
$ShortcutPath  = Join-Path $StartMenuDir "$BinaryName.lnk"
$BinaryPath    = Join-Path $InstallDir "$BinaryName.exe"
$IconSrc       = Join-Path $TmpDir "assets\icon.png"
$IconDir       = Join-Path $env:LOCALAPPDATA "$BinaryName"
$IconDest      = Join-Path $IconDir "$BinaryName.ico"

if (Test-Path $IconSrc) {
  New-Item -ItemType Directory -Force -Path $IconDir | Out-Null
  Copy-Item -Force $IconSrc $IconDest
}

$WshShell  = New-Object -ComObject WScript.Shell
$Shortcut  = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath       = $BinaryPath
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.Description      = "A simple Muslim companion app."
if (Test-Path $IconDest) {
  $Shortcut.IconLocation = $IconDest
}
$Shortcut.Save()

Success "Start Menu shortcut created at $ShortcutPath"

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