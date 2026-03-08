package hijri

import (
	"fmt"
	"time"
)

// HijriDate represents a date in the Islamic (Hijri) calendar
type HijriDate struct {
	Day   int `json:"day"`
	Month int `json:"month"`
	Year  int `json:"year"`
}

// HijriMonths contains English names for Hijri months
var HijriMonths = [13]string{
	"", // 1-indexed
	"Muharram",
	"Safar",
	"Rabi' al-Awwal",
	"Rabi' al-Thani",
	"Jumada al-Awwal",
	"Jumada al-Thani",
	"Rajab",
	"Sha'ban",
	"Ramadan",
	"Shawwal",
	"Dhu al-Qi'dah",
	"Dhu al-Hijjah",
}

// HijriMonthsShort contains short English names for Hijri months
var HijriMonthsShort = [13]string{
	"",
	"Muharram", "Safar", "Rabi I", "Rabi II",
	"Jumad I", "Jumad II", "Rajab", "Sha'ban",
	"Ramadan", "Shawwal", "Dhul-Qa'dah", "Dhul-Hijjah",
}

// ToHijri converts a Gregorian date to Hijri using the Umm al-Qura algorithm
// with an optional offset (in days) for local moon sighting adjustment.
func ToHijri(t time.Time, offsetDays int) HijriDate {
	// Apply offset
	t = t.AddDate(0, 0, offsetDays)

	// Julian Day Number (JDN) calculation
	y, m, d := t.Date()
	a := (14 - int(m)) / 12
	y1 := y + 4800 - a
	m1 := int(m) + 12*a - 3
	jdn := d + (153*m1+2)/5 + 365*y1 + y1/4 - y1/100 + y1/400 - 32045

	// Convert JDN to Hijri
	l := jdn - 1948440 + 10632
	n := (l - 1) / 10631
	l = l - 10631*n + 354
	j := ((10985-l)/5316)*((50*l)/17719) + (l/5670)*((43*l)/15238)
	l = l - ((30-j)/15)*((17719*j)/50) - (j/16)*((15238*j)/43) + 29
	month := (24 * l) / 709
	day := l - (709*month)/24
	year := 30*n + j - 30

	return HijriDate{Day: day, Month: month, Year: year}
}

// Format produces a human-readable Hijri date string
// e.g. "15 Ramadan 1445 H"
func (h HijriDate) Format() string {
	if h.Month < 1 || h.Month > 12 {
		return fmt.Sprintf("%d/%d/%d H", h.Day, h.Month, h.Year)
	}
	return fmt.Sprintf("%d %s %d H", h.Day, HijriMonths[h.Month], h.Year)
}

// FormatShort produces a short Hijri date string
// e.g. "15 Ramadan 1445"
func (h HijriDate) FormatShort() string {
	if h.Month < 1 || h.Month > 12 {
		return fmt.Sprintf("%d/%d/%d", h.Day, h.Month, h.Year)
	}
	return fmt.Sprintf("%d %s %d", h.Day, HijriMonthsShort[h.Month], h.Year)
}

// TodayHijri returns today's Hijri date with the given day offset
func TodayHijri(offsetDays int) HijriDate {
	return ToHijri(time.Now(), offsetDays)
}
