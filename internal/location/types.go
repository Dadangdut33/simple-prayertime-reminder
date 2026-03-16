package location

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
	Status   string  `json:"status"`
	Country  string  `json:"country"`
	City     string  `json:"city"`
	Lat      float64 `json:"lat"`
	Lon      float64 `json:"lon"`
	Timezone string  `json:"timezone"`
	Message  string  `json:"message"`
}

// Service handles location detection and management
type Service struct {
	current Location
}
