package prayer

import (
	"sync"
	"time"

	prayer "github.com/hablullah/go-prayer"
)

// CalculationMethod maps method names to their TwilightConvention
type CalculationMethod string

const (
	MethodAstronomical CalculationMethod = "AstronomicalTwilight"
	MethodMWL          CalculationMethod = "MWL"
	MethodISNA         CalculationMethod = "ISNA"
	MethodEgypt        CalculationMethod = "Egypt"
	MethodEgyptBis     CalculationMethod = "EgyptBis"
	MethodMakkah       CalculationMethod = "UmmAlQura"
	MethodGulf         CalculationMethod = "Gulf"
	MethodAlgerian     CalculationMethod = "Algerian"
	MethodKarachi      CalculationMethod = "Karachi"
	MethodKemenag      CalculationMethod = "Kemenag"
	MethodJAKIM        CalculationMethod = "JAKIM"
	MethodMUIS         CalculationMethod = "MUIS"
	MethodTurkey       CalculationMethod = "Diyanet"
	MethodUOIF         CalculationMethod = "UOIF"
	MethodFrance15     CalculationMethod = "France15"
	MethodFrance18     CalculationMethod = "France18"
	MethodTunisia      CalculationMethod = "Tunisia"
	MethodTehran       CalculationMethod = "Tehran"
	MethodJafari       CalculationMethod = "Jafari"
	MethodCustom       CalculationMethod = "Custom"
)

// AsrMethod represents Asr calculation convention
type AsrMethod string

const (
	AsrShafii AsrMethod = "Shafii"
	AsrHanafi AsrMethod = "Hanafi"
)

// PrayerOffsets stores minute-based offsets for each prayer
type PrayerOffsets struct {
	Fajr    float64 `json:"fajr"`
	Sunrise float64 `json:"sunrise"`
	Zuhr    float64 `json:"zuhr"`
	Asr     float64 `json:"asr"`
	Maghrib float64 `json:"maghrib"`
	Isha    float64 `json:"isha"`
}

// DaySchedule holds the full set of prayer times for a day
type DaySchedule struct {
	Date     string    `json:"date"`
	Fajr     time.Time `json:"fajr"`
	Sunrise  time.Time `json:"sunrise"`
	Zuhr     time.Time `json:"zuhr"`
	Asr      time.Time `json:"asr"`
	Maghrib  time.Time `json:"maghrib"`
	Isha     time.Time `json:"isha"`
	IsNormal bool      `json:"isNormal"`
}

// NextPrayerInfo holds info about the upcoming prayer
type NextPrayerInfo struct {
	Name string    `json:"name"`
	Time time.Time `json:"time"`
}

// PrayerConfig holds all prayer configuration
type PrayerConfig struct {
	Latitude              float64           `json:"latitude"`
	Longitude             float64           `json:"longitude"`
	Elevation             float64           `json:"elevation"`
	Timezone              string            `json:"timezone"`
	Method                CalculationMethod `json:"method"`
	AsrMethod             AsrMethod         `json:"asrMethod"`
	Offsets               PrayerOffsets     `json:"offsets"`
	CustomFajrAngle       float64           `json:"customFajrAngle"`
	CustomIshaAngle       float64           `json:"customIshaAngle"`
	CustomMaghribDuration float64           `json:"customMaghribDuration"`
}

// Service handles prayer time calculations
type Service struct {
	cfg       PrayerConfig
	yearCache map[int][]prayer.Schedule
	mu        sync.RWMutex
}
