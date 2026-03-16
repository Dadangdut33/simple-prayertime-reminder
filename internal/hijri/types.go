package hijri

// HijriDate represents a date in the Islamic (Hijri) calendar
type HijriDate struct {
	Day   int `json:"day"`
	Month int `json:"month"`
	Year  int `json:"year"`
}

// CalendarDay associates a Gregorian ISO date with its Hijri equivalent.
type CalendarDay struct {
	Date  string    `json:"date"`
	Hijri HijriDate `json:"hijri"`
}
