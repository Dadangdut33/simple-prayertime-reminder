package appservice

import (
	"os"
	"path/filepath"
	"runtime"
	"runtime/debug"
	"strings"

	"github.com/pkg/browser"
)

const (
	defaultAppVersion = "2.0.0"
	repositoryURL     = "https://github.com/dadangdut33/simple-prayertime-reminder"
)

type AppInfo struct {
	Version         string `json:"version"`
	RepositoryURL   string `json:"repositoryUrl"`
	DetectedOS      string `json:"detectedOs"`
	InstallMethod   string `json:"installMethod"`
	ConfigDirectory string `json:"configDirectory"`
	ConfigFile      string `json:"configFile"`
	ExecutablePath  string `json:"executablePath"`
}

func ConfigDirectory() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		log.Error("config directory: user home not found", "error", err)
		return "", err
	}
	return filepath.Join(homeDir, ".config", "simple-prayertime-reminder"), nil
}

func resolveVersion() string {
	if buildInfo, ok := debug.ReadBuildInfo(); ok {
		if version := buildInfo.Main.Version; version != "" && version != "(devel)" {
			return version
		}
	}

	return defaultAppVersion
}

func humanOS(goos string) string {
	switch goos {
	case "darwin":
		return "macOS"
	case "windows":
		return "Windows"
	case "linux":
		return "Linux"
	default:
		return goos
	}
}

func detectInstallMethod(executablePath string) string {
	lowerPath := strings.ToLower(executablePath)

	switch runtime.GOOS {
	case "linux":
		switch {
		case os.Getenv("APPIMAGE") != "" || strings.HasSuffix(lowerPath, ".appimage"):
			return "AppImage"
		case strings.Contains(lowerPath, "/snap/"):
			return "Snap"
		case strings.Contains(lowerPath, "/flatpak/") || strings.Contains(lowerPath, "/var/lib/flatpak/"):
			return "Flatpak"
		case strings.Contains(lowerPath, "/go/bin/"):
			return "go install"
		case strings.Contains(lowerPath, "/usr/bin/") || strings.Contains(lowerPath, "/usr/local/bin/"):
			return "System package / manual install"
		}
	case "darwin":
		switch {
		case strings.Contains(lowerPath, ".app/contents/macos/"):
			return "macOS app bundle"
		case strings.Contains(lowerPath, "/go/bin/"):
			return "go install"
		}
	case "windows":
		switch {
		case strings.Contains(lowerPath, `\go\bin\`):
			return "go install"
		case strings.Contains(lowerPath, `\program files\`) || strings.Contains(lowerPath, `\appdata\local\programs\`):
			return "Windows installer"
		}
	}

	return "Custom build / unknown"
}

func (s *Service) GetAppInfo() (AppInfo, error) {
	configDir, err := ConfigDirectory()
	if err != nil {
		log.Error("get app info: config dir failed", "error", err)
		return AppInfo{}, err
	}

	executablePath, err := os.Executable()
	if err != nil {
		log.Error("get app info: executable path failed", "error", err)
		return AppInfo{}, err
	}

	return AppInfo{
		Version:         resolveVersion(),
		RepositoryURL:   repositoryURL,
		DetectedOS:      humanOS(runtime.GOOS),
		InstallMethod:   detectInstallMethod(executablePath),
		ConfigDirectory: configDir,
		ConfigFile:      filepath.Join(configDir, "settings.json"),
		ExecutablePath:  executablePath,
	}, nil
}

func (s *Service) OpenConfigLocation() error {
	configDir, err := ConfigDirectory()
	if err != nil {
		log.Error("open config location failed", "error", err)
		return err
	}

	if err := browser.OpenFile(configDir); err != nil {
		log.Error("open config location: browser open failed", "error", err)
		return err
	}
	log.Info("open config location")
	return nil
}

func (s *Service) OpenURL(url string) error {
	if err := browser.OpenURL(url); err != nil {
		log.Error("open url failed", "error", err, "url", url)
		return err
	}
	log.Info("open url", "url", url)
	return nil
}
