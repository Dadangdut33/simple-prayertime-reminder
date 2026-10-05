package prayersync

// ProviderInfo describes the configuration and capabilities of a timetable provider.
// Localized labels and explanatory copy remain in the frontend.
type ProviderInfo struct {
	ID                string   `json:"id"`
	Name              string   `json:"name"`
	Source            string   `json:"source"`
	URL               string   `json:"url"`
	Regional          bool     `json:"regional"`
	Timezones         []string `json:"timezones"`
	LocationType      string   `json:"locationType"`
	HasLocationList   bool     `json:"hasLocationList"`
	HasRegionSelector bool     `json:"hasRegionSelector"`
}

// Providers returns the supported timetable providers and their capabilities.
func Providers() []ProviderInfo {
	return []ProviderInfo{
		{
			ID: "aladhan", Name: "AlAdhan", Source: sourceURL, URL: sourceURL,
			Timezones: nil,
		},
		{
			ID: "myquran", Name: "myQuran", Source: myquranSource, URL: myquranSource,
			Regional: true, Timezones: []string{"Asia/Jakarta", "Asia/Pontianak", "Asia/Makassar", "Asia/Jayapura"},
			LocationType: "city", HasLocationList: true,
		},
		{
			ID: "jakim", Name: "JAKIM e-Solat", Source: jakimSource, URL: jakimSource,
			Regional: true, Timezones: []string{"Asia/Kuala_Lumpur", "Asia/Kuching"},
			LocationType: "zone", HasLocationList: true,
		},
		{
			ID: "diyanet", Name: "Diyanet via EzanVakti", Source: diyanetSource, URL: diyanetSource,
			Regional: true, Timezones: []string{"Europe/Istanbul", "Asia/Istanbul", "Turkey"},
			LocationType: "district", HasLocationList: true, HasRegionSelector: true,
		},
		{
			ID: "muis", Name: "MUIS / data.gov.sg", Source: muisSource, URL: muisSource,
			Regional: true, Timezones: []string{"Asia/Singapore"},
		},
	}
}
