package appservice

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"golang.org/x/mod/semver"
)

type releaseInfo struct {
	Version string
	URL     string
}

type UpdateInfo struct {
	CurrentVersion string `json:"currentVersion"`
	LatestVersion  string `json:"latestVersion"`
	ReleaseURL     string `json:"releaseUrl"`
	HasUpdate      bool   `json:"hasUpdate"`
	InstallMethod  string `json:"installMethod"`
	UpdateTitle    string `json:"updateTitle"`
	UpdateDetail   string `json:"updateDetail"`
	ActionLabel    string `json:"actionLabel"`
	UpdateCommand  string `json:"updateCommand"`
}

func normalizeSemver(version string) string {
	version = strings.TrimSpace(version)
	if version == "" {
		return ""
	}

	if !strings.HasPrefix(version, "v") {
		version = "v" + version
	}

	parts := strings.SplitN(strings.TrimPrefix(version, "v"), "-", 2)
	core := strings.Split(parts[0], ".")
	for len(core) < 3 {
		core = append(core, "0")
	}

	version = "v" + strings.Join(core, ".")
	if len(parts) == 2 {
		version += "-" + parts[1]
	}

	if !semver.IsValid(version) {
		return ""
	}

	return version
}

func fetchLatestRelease() (releaseInfo, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	releaseReq, err := http.NewRequest(
		http.MethodGet,
		"https://api.github.com/repos/dadangdut33/simple-prayertime-reminder/releases/latest",
		nil,
	)
	if err != nil {
		return releaseInfo{}, err
	}
	releaseReq.Header.Set("Accept", "application/vnd.github+json")
	releaseReq.Header.Set("User-Agent", "simple-prayertime-reminder")

	releaseResp, err := client.Do(releaseReq)
	if err != nil {
		return releaseInfo{}, fmt.Errorf("failed to query latest release: %w", err)
	}
	defer releaseResp.Body.Close()

	if releaseResp.StatusCode >= 200 && releaseResp.StatusCode < 300 {
		var payload struct {
			TagName string `json:"tag_name"`
			Name    string `json:"name"`
			HTMLURL string `json:"html_url"`
		}
		if err := json.NewDecoder(releaseResp.Body).Decode(&payload); err != nil {
			return releaseInfo{}, fmt.Errorf("failed to parse latest release response: %w", err)
		}

		return releaseInfo{
			Version: firstNonEmpty(payload.TagName, payload.Name, "unknown"),
			URL:     firstNonEmpty(payload.HTMLURL, repositoryURL+"/releases"),
		}, nil
	}

	tagReq, err := http.NewRequest(
		http.MethodGet,
		"https://api.github.com/repos/dadangdut33/simple-prayertime-reminder/tags?per_page=1",
		nil,
	)
	if err != nil {
		return releaseInfo{}, err
	}
	tagReq.Header.Set("Accept", "application/vnd.github+json")
	tagReq.Header.Set("User-Agent", "simple-prayertime-reminder")

	tagResp, err := client.Do(tagReq)
	if err != nil {
		return releaseInfo{}, fmt.Errorf("failed to query latest tag: %w", err)
	}
	defer tagResp.Body.Close()

	if tagResp.StatusCode < 200 || tagResp.StatusCode >= 300 {
		return releaseInfo{}, fmt.Errorf("unable to check GitHub for the latest version")
	}

	var payload []struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(tagResp.Body).Decode(&payload); err != nil {
		return releaseInfo{}, fmt.Errorf("failed to parse tags response: %w", err)
	}
	if len(payload) == 0 || payload[0].Name == "" {
		return releaseInfo{}, fmt.Errorf("no release or tag information is available yet")
	}

	return releaseInfo{
		Version: payload[0].Name,
		URL:     repositoryURL + "/releases/tag/" + payload[0].Name,
	}, nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}

	return ""
}

func buildUpdateInstructions(appInfo AppInfo, latest releaseInfo) UpdateInfo {
	update := UpdateInfo{
		CurrentVersion: appInfo.Version,
		LatestVersion:  latest.Version,
		ReleaseURL:     latest.URL,
		InstallMethod:  appInfo.InstallMethod,
		ActionLabel:    "Open Latest Release",
	}

	switch appInfo.InstallMethod {
	case "go install":
		update.UpdateTitle = "Update with go install"
		update.UpdateDetail = "This copy was installed with Go. Run the command below to fetch and install the latest tagged version."
		update.ActionLabel = "Open Repository"
		update.ReleaseURL = appInfo.RepositoryURL
		update.UpdateCommand = "go install github.com/dadangdut33/simple-prayertime-reminder@latest"
	case "Snap":
		update.UpdateTitle = "Update through Snap"
		update.UpdateDetail = "This copy appears to be installed with Snap. Refresh the package or download the newest release manually."
		update.UpdateCommand = "sudo snap refresh simple-prayertime-reminder"
	case "Flatpak":
		update.UpdateTitle = "Update through Flatpak"
		update.UpdateDetail = "This copy appears to be installed with Flatpak. Update it with Flatpak or review the latest release notes."
		update.UpdateCommand = "flatpak update"
	case "AppImage", "macOS app bundle", "Windows installer", "System package / manual install":
		update.UpdateTitle = "Download the latest release"
		update.UpdateDetail = "A newer packaged build is available for download."
	default:
		update.UpdateTitle = "Update available"
		update.UpdateDetail = "A newer version is available. Download the latest release or rebuild from the latest source."
	}

	return update
}

func (s *Service) CheckForUpdates() (UpdateInfo, error) {
	appInfo, err := s.GetAppInfo()
	if err != nil {
		return UpdateInfo{}, err
	}

	latest, err := fetchLatestRelease()
	if err != nil {
		return UpdateInfo{}, err
	}

	result := buildUpdateInstructions(appInfo, latest)

	currentSemver := normalizeSemver(appInfo.Version)
	latestSemver := normalizeSemver(latest.Version)
	result.HasUpdate = currentSemver != "" && latestSemver != "" && semver.Compare(currentSemver, latestSemver) < 0

	return result, nil
}
