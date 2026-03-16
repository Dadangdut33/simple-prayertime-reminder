package export

import "time"

// MonthRow represents one exported prayer-time row.
type MonthRow struct {
	GregorianDate string
	HijriDate     string
	Fajr          time.Time
	Sunrise       time.Time
	Zuhr          time.Time
	Asr           time.Time
	Maghrib       time.Time
	Isha          time.Time
}
