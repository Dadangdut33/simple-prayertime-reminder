package location

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Location holds geographic location data
type Location struct {
	City      string  `json:"city"`
	Country   string  `json:"country"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Elevation float64 `json:"elevation"`
	Timezone  string  `json:"timezone"`
}

// ipAPIResponse is the response structure from ip-api.com
type ipAPIResponse struct {
	Status      string  `json:"status"`
	Country     string  `json:"country"`
	City        string  `json:"city"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
	Timezone    string  `json:"timezone"`
	Message     string  `json:"message"`
}

// Service handles location detection and management
type Service struct {
	current Location
}

// NewService creates a new Location service with a default location
func NewService(initial Location) *Service {
	return &Service{current: initial}
}

// DetectFromIP auto-detects location using the ip-api.com geolocation service
func (svc *Service) DetectFromIP() (Location, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get("http://ip-api.com/json/?fields=status,message,country,city,lat,lon,timezone")
	if err != nil {
		return Location{}, fmt.Errorf("geolocation request failed: %w", err)
	}
	defer resp.Body.Close()

	var apiResp ipAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return Location{}, fmt.Errorf("failed to parse geolocation response: %w", err)
	}

	if apiResp.Status != "success" {
		return Location{}, fmt.Errorf("geolocation failed: %s", apiResp.Message)
	}

	loc := Location{
		City:      apiResp.City,
		Country:   apiResp.Country,
		Latitude:  apiResp.Lat,
		Longitude: apiResp.Lon,
		Timezone:  apiResp.Timezone,
	}

	svc.current = loc
	return loc, nil
}

// SetManual sets a manually specified location
func (svc *Service) SetManual(loc Location) {
	svc.current = loc
}

// Get returns the current location
func (svc *Service) Get() Location {
	return svc.current
}
