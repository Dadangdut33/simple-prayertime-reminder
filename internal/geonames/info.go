package geonames

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"
)

const (
	defaultSource = "GeoNames cities500"
)

type DataInfo struct {
	Source      string `json:"source"`
	LastUpdated string `json:"lastUpdated"`
}

func GetDataInfo() (DataInfo, error) {
	if metadataPath != "" {
		if info, err := readMetadata(metadataPath); err == nil {
			return info, nil
		}
	}

	readme, err := data.ReadFile("readme.md")
	if err != nil {
		return DataInfo{
			Source:      defaultSource,
			LastUpdated: "Unknown",
		}, nil
	}

	return DataInfo{
		Source:      defaultSource,
		LastUpdated: parseReadmeTimestamp(string(readme)),
	}, nil
}

func WriteMetadata(path string, info DataInfo) error {
	if path == "" {
		return nil
	}
	if info.Source == "" {
		info.Source = defaultSource
	}
	if info.LastUpdated == "" {
		info.LastUpdated = time.Now().UTC().Format(time.RFC3339)
	}
	payload, err := json.MarshalIndent(info, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal geonames metadata: %w", err)
	}
	if err := os.WriteFile(path, payload, 0644); err != nil {
		return fmt.Errorf("write geonames metadata: %w", err)
	}
	return nil
}

func readMetadata(path string) (DataInfo, error) {
	dataBytes, err := os.ReadFile(path)
	if err != nil {
		return DataInfo{}, err
	}
	var info DataInfo
	if err := json.Unmarshal(dataBytes, &info); err != nil {
		return DataInfo{}, err
	}
	if info.Source == "" {
		info.Source = defaultSource
	}
	if info.LastUpdated == "" {
		info.LastUpdated = "Unknown"
	}
	return info, nil
}

func parseReadmeTimestamp(content string) string {
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(strings.ToLower(line), "data downloaded:") {
			return strings.TrimSpace(strings.TrimPrefix(line, "Data downloaded:"))
		}
	}
	return "Unknown"
}
