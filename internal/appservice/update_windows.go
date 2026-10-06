//go:build windows

package appservice

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
	"unicode/utf16"
)

const githubLatestReleaseAPI = "https://api.github.com/repos/dadangdut33/simple-prayertime-reminder/releases/latest"

type windowsReleaseAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

type windowsRelease struct {
	TagName string                `json:"tag_name"`
	Assets  []windowsReleaseAsset `json:"assets"`
}

// InstallWindowsUpdate downloads and verifies the matching NSIS installer,
// then runs it after this process exits. NSIS requests elevation to replace
// the Program Files installation.
func InstallWindowsUpdate(onExit func()) error {
	if runtime.GOARCH != "amd64" && runtime.GOARCH != "arm64" {
		return fmt.Errorf("automatic updates are not available for Windows %s", runtime.GOARCH)
	}

	client := &http.Client{Timeout: 2 * time.Minute}
	release, err := fetchWindowsLatestRelease(client)
	if err != nil {
		return err
	}
	assetName := fmt.Sprintf("simple-prayertime-reminder-v%s-windows-%s-installer.exe", strings.TrimPrefix(release.TagName, "v"), runtime.GOARCH)
	var installerURL, checksumURL string
	for _, asset := range release.Assets {
		switch asset.Name {
		case assetName:
			installerURL = asset.BrowserDownloadURL
		case "SHA256SUMS":
			checksumURL = asset.BrowserDownloadURL
		}
	}
	if installerURL == "" || checksumURL == "" {
		return fmt.Errorf("release %s does not contain a verified Windows %s installer", release.TagName, runtime.GOARCH)
	}

	checksum, err := fetchWindowsChecksum(client, checksumURL, assetName)
	if err != nil {
		return err
	}

	cacheDir, err := os.UserCacheDir()
	if err != nil {
		return fmt.Errorf("find update cache directory: %w", err)
	}
	updateDir := filepath.Join(cacheDir, "simple-prayertime-reminder", "updates")
	if err := os.MkdirAll(updateDir, 0o700); err != nil {
		return fmt.Errorf("create update cache directory: %w", err)
	}
	installerPath := filepath.Join(updateDir, assetName)
	if err := downloadVerifiedWindowsInstaller(client, installerURL, installerPath, checksum); err != nil {
		return err
	}

	executablePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("locate installed application: %w", err)
	}
	if err := scheduleWindowsInstaller(installerPath, executablePath, os.Getpid()); err != nil {
		return err
	}
	if onExit != nil {
		onExit()
	}
	return nil
}

func fetchWindowsLatestRelease(client *http.Client) (windowsRelease, error) {
	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, githubLatestReleaseAPI, nil)
	if err != nil {
		return windowsRelease{}, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "simple-prayertime-reminder")
	resp, err := client.Do(req)
	if err != nil {
		return windowsRelease{}, fmt.Errorf("check for the latest release: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return windowsRelease{}, fmt.Errorf("check for the latest release: GitHub returned HTTP %d", resp.StatusCode)
	}
	var release windowsRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return windowsRelease{}, fmt.Errorf("read latest release information: %w", err)
	}
	return release, nil
}

func fetchWindowsChecksum(client *http.Client, url, assetName string) (string, error) {
	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "simple-prayertime-reminder")
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("download update checksums: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("download update checksums: GitHub returned HTTP %d", resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", fmt.Errorf("read update checksums: %w", err)
	}
	for _, line := range strings.Split(string(data), "\n") {
		fields := strings.Fields(line)
		if len(fields) == 2 && strings.TrimPrefix(fields[1], "*") == assetName {
			if len(fields[0]) != sha256.Size*2 {
				break
			}
			if _, err := hex.DecodeString(fields[0]); err != nil {
				break
			}
			return strings.ToLower(fields[0]), nil
		}
	}
	return "", fmt.Errorf("release checksum is missing for %s", assetName)
}

func downloadVerifiedWindowsInstaller(client *http.Client, url, path, expectedChecksum string) error {
	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "simple-prayertime-reminder")
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("download update installer: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("download update installer: GitHub returned HTTP %d", resp.StatusCode)
	}

	tempFile, err := os.CreateTemp(filepath.Dir(path), "update-*.exe")
	if err != nil {
		return fmt.Errorf("create temporary installer: %w", err)
	}
	tempPath := tempFile.Name()
	defer os.Remove(tempPath)
	hash := sha256.New()
	written, err := io.Copy(io.MultiWriter(tempFile, hash), io.LimitReader(resp.Body, 1<<30))
	if err != nil {
		_ = tempFile.Close()
		return fmt.Errorf("save update installer: %w", err)
	}
	if written == 1<<30 {
		_ = tempFile.Close()
		return fmt.Errorf("update installer exceeds the 1 GiB download limit")
	}
	if err := tempFile.Close(); err != nil {
		return fmt.Errorf("finish update installer download: %w", err)
	}
	if actual := hex.EncodeToString(hash.Sum(nil)); actual != expectedChecksum {
		return fmt.Errorf("update installer checksum mismatch")
	}
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("replace cached update installer: %w", err)
	}
	if err := os.Rename(tempPath, path); err != nil {
		return fmt.Errorf("prepare update installer: %w", err)
	}
	return nil
}

func scheduleWindowsInstaller(installerPath, executablePath string, processID int) error {
	quotePowerShell := func(value string) string { return "'" + strings.ReplaceAll(value, "'", "''") + "'" }
	script := fmt.Sprintf(`$appPid = %d
while (Get-Process -Id $appPid -ErrorAction SilentlyContinue) { Start-Sleep -Milliseconds 250 }
try { Start-Process -FilePath %s -Verb RunAs -Wait | Out-Null } catch { }
Start-Process -FilePath %s`, processID, quotePowerShell(installerPath), quotePowerShell(executablePath))
	encoded := base64.StdEncoding.EncodeToString(encodePowerShellUTF16(script))
	cmd := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-EncodedCommand", encoded)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start the update installer: %w", err)
	}
	return nil
}

func encodePowerShellUTF16(value string) []byte {
	units := utf16.Encode([]rune(value))
	encoded := make([]byte, 0, len(units)*2)
	for _, unit := range units {
		encoded = append(encoded, byte(unit), byte(unit>>8))
	}
	return encoded
}
