package appservice

import (
	"path/filepath"
	"testing"
)

func TestCanInstallInAppWindowsInstallerRequiresMatchingVerifiedAsset(t *testing.T) {
	appInfo := AppInfo{InstallMethod: "Windows installer"}
	latest := releaseInfo{
		Version: "v2.1.0",
		Assets: []releaseAsset{
			{Name: "simple-prayertime-reminder-v2.1.0-windows-amd64-installer.exe"},
			{Name: "SHA256SUMS"},
		},
	}

	if !canInstallInApp(appInfo, latest, "windows", "amd64") {
		t.Fatal("expected matching Windows installer to be available")
	}
	if canInstallInApp(appInfo, latest, "windows", "arm64") {
		t.Fatal("did not expect a Windows installer for a different architecture")
	}

	latest.Assets = latest.Assets[:1]
	if canInstallInApp(appInfo, latest, "windows", "amd64") {
		t.Fatal("did not expect an update without the checksum file")
	}
}

func TestCanInstallInAppChecksExecutableAssetAndWriteAccess(t *testing.T) {
	dir := t.TempDir()
	appInfo := AppInfo{
		InstallMethod:  "go install",
		ExecutablePath: filepath.Join(dir, "simple-prayertime-reminder"),
	}
	latest := releaseInfo{
		Version: "v2.1.0",
		Assets: []releaseAsset{
			{Name: "simple-prayertime-reminder-v2.1.0-linux-amd64"},
			{Name: "SHA256SUMS"},
		},
	}

	if !canInstallInApp(appInfo, latest, "linux", "amd64") {
		t.Fatal("expected matching executable in a writable directory to be installable")
	}
	if canInstallInApp(AppInfo{InstallMethod: "Snap", ExecutablePath: appInfo.ExecutablePath}, latest, "linux", "amd64") {
		t.Fatal("did not expect package-managed installations to self-update")
	}
	if canInstallInApp(appInfo, latest, "linux", "arm64") {
		t.Fatal("did not expect an update for a different architecture")
	}
}
