package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

type replacement struct {
	re   *regexp.Regexp
	with string
}

func main() {
	if len(os.Args) < 2 || len(os.Args) > 3 {
		fmt.Fprintln(os.Stderr, "usage: go run ./build/tools/set-version <version> [--dry-run]")
		os.Exit(2)
	}
	version := strings.TrimSpace(os.Args[1])
	dryRun := len(os.Args) == 3 && os.Args[2] == "--dry-run"
	if version == "" {
		fmt.Fprintln(os.Stderr, "version cannot be empty")
		os.Exit(2)
	}
	if len(os.Args) == 3 && !dryRun {
		fmt.Fprintln(os.Stderr, "unknown flag:", os.Args[2])
		os.Exit(2)
	}

	msixVersion := version + ".0"

	updates := []struct {
		path         string
		replacements []replacement
	}{
		{
			path: "build/config.yml",
			replacements: []replacement{
				{regexp.MustCompile(`(?m)^(info:\s*\n(?:[ \t].*\n)*)[ \t]*version:\s*"[^"]*"`), `${1}  version: "` + version + `"`},
			},
		},
		{
			path: "frontend/package.json",
			replacements: []replacement{
				{regexp.MustCompile(`(?m)^(\s*"version"\s*:\s*")[^"]*(")`), `${1}` + version + `${2}`},
			},
		},
		{
			path: "build/linux/nfpm/nfpm.yaml",
			replacements: []replacement{
				{regexp.MustCompile(`(?m)^(version:\s*")[^"]*(")`), `${1}` + version + `${2}`},
			},
		},
		{
			path: "build/windows/wails.exe.manifest",
			replacements: []replacement{
				{regexp.MustCompile(`(?m)(<assemblyIdentity[^>]*\bname="com\.dadangdut33\.simple-prayertime-reminder"[^>]*\bversion=")[^"]*(")`), `${1}` + version + `${2}`},
			},
		},
		{
			path: "build/windows/wails_tools.nsh",
			replacements: []replacement{
				{regexp.MustCompile(`(?m)^(!define\s+INFO_PRODUCTVERSION\s+")([^"]*)(")`), `${1}` + version + `${3}`},
			},
		},
		{
			path: "build/windows/msix/template.xml",
			replacements: []replacement{
				{regexp.MustCompile(`(?m)(<PackageInformation[^>]*\bVersion=")[^"]*(")`), `${1}` + msixVersion + `${2}`},
			},
		},
		{
			path: "build/windows/msix/app_manifest.xml",
			replacements: []replacement{
				{regexp.MustCompile(`(?m)(<Identity[^>]*\bVersion=")[^"]*(")`), `${1}` + msixVersion + `${2}`},
			},
		},
		{
			path: "build/windows/info.json",
			replacements: []replacement{
				{regexp.MustCompile(`(?m)("file_version"\s*:\s*")[^"]*(")`), `${1}` + version + `${2}`},
				{regexp.MustCompile(`(?m)("ProductVersion"\s*:\s*")[^"]*(")`), `${1}` + version + `${2}`},
			},
		},
		{
			path: "build/ios/build.sh",
			replacements: []replacement{
				{regexp.MustCompile(`(?m)^(VERSION=)"[^"]*"`), `${1}"` + version + `"`},
				{regexp.MustCompile(`(?m)^(BUILD_NUMBER=)"[^"]*"`), `${1}"` + version + `"`},
			},
		},
		{
			path:         "build/ios/Info.plist",
			replacements: plistReplacements(version),
		},
		{
			path:         "build/ios/Info.dev.plist",
			replacements: plistReplacements(version + "-dev"),
		},
		{
			path:         "build/darwin/Info.plist",
			replacements: plistReplacements(version),
		},
		{
			path:         "build/darwin/Info.dev.plist",
			replacements: plistReplacements(version + "-dev"),
		},
	}

	var changed []string
	for _, entry := range updates {
		ok, err := applyReplacements(entry.path, entry.replacements, dryRun)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error updating %s: %v\n", entry.path, err)
			os.Exit(1)
		}
		if ok {
			changed = append(changed, entry.path)
		}
	}

	if len(changed) == 0 {
		fmt.Println("No files updated.")
		return
	}

	if dryRun {
		fmt.Println("Would update:")
	} else {
		fmt.Println("Updated:")
	}
	for _, path := range changed {
		fmt.Println(" -", path)
	}
}

func plistReplacements(version string) []replacement {
	return []replacement{
		{regexp.MustCompile(`(?ms)(<key>CFBundleShortVersionString</key>\s*<string>)([^<]+)(</string>)`), `${1}` + version + `${3}`},
		{regexp.MustCompile(`(?ms)(<key>CFBundleVersion</key>\s*<string>)([^<]+)(</string>)`), `${1}` + version + `${3}`},
	}
}

func applyReplacements(path string, reps []replacement, dryRun bool) (bool, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return false, nil
		}
		return false, err
	}

	original := string(data)
	updated := original
	for _, rep := range reps {
		updated = rep.re.ReplaceAllString(updated, rep.with)
	}
	if updated == original {
		return false, nil
	}

	if dryRun {
		return true, nil
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return false, err
	}
	if err := os.WriteFile(path, []byte(updated), 0o644); err != nil {
		return false, err
	}
	return true, nil
}
