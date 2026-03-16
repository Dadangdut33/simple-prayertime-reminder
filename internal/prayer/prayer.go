package prayer

import (
	"fmt"
	"sync"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/clock"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/logging"
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

var log = logging.With("prayer")

// NewService creates a new Prayer service
func NewService() *Service {
	return &Service{
		yearCache: make(map[int][]prayer.Schedule),
	}
}

// SetConfig updates the prayer configuration and clears cache
func (svc *Service) SetConfig(cfg PrayerConfig) {
	svc.mu.Lock()
	svc.cfg = cfg
	svc.yearCache = make(map[int][]prayer.Schedule)
	svc.mu.Unlock()
	log.Info("prayer config set", "method", cfg.Method, "timezone", cfg.Timezone)
}

// getConvention returns the TwilightConvention for the method
func getConvention(cfg PrayerConfig) *prayer.TwilightConvention {
	switch cfg.Method {
	case MethodAstronomical:
		return prayer.AstronomicalTwilight()
	case MethodMWL:
		return prayer.MWL()
	case MethodISNA:
		return prayer.ISNA()
	case MethodEgypt:
		return prayer.Egypt()
	case MethodEgyptBis:
		return prayer.EgyptBis()
	case MethodMakkah:
		return prayer.UmmAlQura()
	case MethodGulf:
		return prayer.Gulf()
	case MethodAlgerian:
		return prayer.Algerian()
	case MethodKarachi:
		return prayer.Karachi()
	case MethodKemenag:
		return prayer.Kemenag()
	case MethodJAKIM:
		return prayer.JAKIM()
	case MethodMUIS:
		return prayer.MUIS()
	case MethodTurkey:
		return prayer.Diyanet()
	case MethodUOIF:
		return prayer.UOIF()
	case MethodFrance15:
		return prayer.France15()
	case MethodFrance18:
		return prayer.France18()
	case MethodTunisia:
		return prayer.Tunisia()
	case MethodTehran:
		return prayer.Tehran()
	case MethodJafari:
		return prayer.Jafari()
	case MethodCustom:
		convention := &prayer.TwilightConvention{
			FajrAngle: cfg.CustomFajrAngle,
			IshaAngle: cfg.CustomIshaAngle,
		}
		if cfg.CustomMaghribDuration > 0 {
			convention.MaghribDuration = time.Duration(cfg.CustomMaghribDuration * float64(time.Minute))
		}
		return convention
	default:
		return prayer.MWL()
	}
}

// getAsrConvention returns the Asr convention
func getAsrConvention(cfg PrayerConfig) prayer.AsrConvention {
	if cfg.AsrMethod == AsrHanafi {
		return prayer.Hanafi
	}
	return prayer.Shafii
}

// computeYear fetches (or reads from cache) the full year's schedule
func (svc *Service) computeYear(year int) ([]prayer.Schedule, error) {
	svc.mu.RLock()
	cached, ok := svc.yearCache[year]
	cfgSnapshot := svc.cfg
	svc.mu.RUnlock()
	if ok {
		return cached, nil
	}

	tz, err := time.LoadLocation(cfgSnapshot.Timezone)
	if err != nil {
		log.Warn("timezone load failed, using UTC", "timezone", cfgSnapshot.Timezone, "error", err)
		tz = time.UTC
	}

	prayerCfg := prayer.Config{
		Latitude:            cfgSnapshot.Latitude,
		Longitude:           cfgSnapshot.Longitude,
		Elevation:           cfgSnapshot.Elevation,
		Timezone:            tz,
		TwilightConvention:  getConvention(cfgSnapshot),
		AsrConvention:       getAsrConvention(cfgSnapshot),
		HighLatitudeAdapter: prayer.NearestLatitude(),
		Corrections: prayer.ScheduleCorrections{
			Fajr:    time.Duration(cfgSnapshot.Offsets.Fajr * float64(time.Minute)),
			Sunrise: time.Duration(cfgSnapshot.Offsets.Sunrise * float64(time.Minute)),
			Zuhr:    time.Duration(cfgSnapshot.Offsets.Zuhr * float64(time.Minute)),
			Asr:     time.Duration(cfgSnapshot.Offsets.Asr * float64(time.Minute)),
			Maghrib: time.Duration(cfgSnapshot.Offsets.Maghrib * float64(time.Minute)),
			Isha:    time.Duration(cfgSnapshot.Offsets.Isha * float64(time.Minute)),
		},
	}

	schedules, err := prayer.Calculate(prayerCfg, year)
	if err != nil {
		log.Error("prayer calculation failed", "error", err, "year", year)
		return nil, fmt.Errorf("prayer calculation failed: %w", err)
	}

	svc.mu.Lock()
	svc.yearCache[year] = schedules
	svc.mu.Unlock()
	log.Info("prayer schedule cached", "year", year)
	return schedules, nil
}

// toDay converts a prayer.Schedule to DaySchedule
func toDay(sc prayer.Schedule) DaySchedule {
	return DaySchedule{
		Date:     sc.Date,
		Fajr:     sc.Fajr,
		Sunrise:  sc.Sunrise,
		Zuhr:     sc.Zuhr,
		Asr:      sc.Asr,
		Maghrib:  sc.Maghrib,
		Isha:     sc.Isha,
		IsNormal: sc.IsNormal,
	}
}

// GetScheduleForDate returns the prayer schedule for a specific date
func (svc *Service) GetScheduleForDate(date time.Time) (DaySchedule, error) {
	schedules, err := svc.computeYear(date.Year())
	if err != nil {
		log.Error("schedule compute failed", "error", err)
		return DaySchedule{}, err
	}

	idx := date.YearDay() - 1
	if idx < 0 || idx >= len(schedules) {
		log.Error("schedule date out of range", "date", date.String())
		return DaySchedule{}, fmt.Errorf("date out of range: %v", date)
	}

	return toDay(schedules[idx]), nil
}

// GetTodaySchedule returns today's prayer schedule
func (svc *Service) GetTodaySchedule() (DaySchedule, error) {
	return svc.GetScheduleForDate(clock.Now())
}

// GetNextPrayer returns info about the next upcoming prayer
func (svc *Service) GetNextPrayer(now time.Time) (NextPrayerInfo, error) {
	sched, err := svc.GetScheduleForDate(now)
	if err != nil {
		log.Error("next prayer schedule failed", "error", err)
		return NextPrayerInfo{}, err
	}

	candidates := []struct {
		name string
		t    time.Time
	}{
		{"Fajr", sched.Fajr},
		{"Sunrise", sched.Sunrise},
		{"Zuhr", sched.Zuhr},
		{"Asr", sched.Asr},
		{"Maghrib", sched.Maghrib},
		{"Isha", sched.Isha},
	}

	for _, p := range candidates {
		if !p.t.IsZero() && p.t.After(now) {
			return NextPrayerInfo{Name: p.name, Time: p.t}, nil
		}
	}

	// All prayers passed — return next day's Fajr
	tomorrowSched, err := svc.GetScheduleForDate(now.AddDate(0, 0, 1))
	if err != nil {
		log.Error("next prayer tomorrow schedule failed", "error", err)
		return NextPrayerInfo{}, err
	}
	return NextPrayerInfo{Name: "Fajr", Time: tomorrowSched.Fajr}, nil
}

// GetMonthSchedule returns prayer schedule for an entire calendar month
func (svc *Service) GetMonthSchedule(year, month int) ([]DaySchedule, error) {
	schedules, err := svc.computeYear(year)
	if err != nil {
		log.Error("month schedule compute failed", "error", err, "year", year)
		return nil, err
	}

	firstDay := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	lastDay := firstDay.AddDate(0, 1, -1)
	startIdx := firstDay.YearDay() - 1
	endIdx := lastDay.YearDay() - 1

	if startIdx < 0 {
		startIdx = 0
	}
	if endIdx >= len(schedules) {
		endIdx = len(schedules) - 1
	}

	result := make([]DaySchedule, 0, endIdx-startIdx+1)
	for i := startIdx; i <= endIdx; i++ {
		result = append(result, toDay(schedules[i]))
	}
	return result, nil
}

// GetScheduleRange returns prayer schedules for an inclusive date range.
func (svc *Service) GetScheduleRange(startDate, endDate time.Time) ([]DaySchedule, error) {
	if endDate.Before(startDate) {
		log.Error("schedule range invalid", "start", startDate, "end", endDate)
		return nil, fmt.Errorf("end date must be on or after start date")
	}

	start := time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, time.UTC)
	end := time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 0, 0, 0, 0, time.UTC)

	result := make([]DaySchedule, 0, int(end.Sub(start).Hours()/24)+1)
	for current := start; !current.After(end); current = current.AddDate(0, 0, 1) {
		schedule, err := svc.GetScheduleForDate(current)
		if err != nil {
			log.Error("schedule range item failed", "error", err, "date", current)
			return nil, err
		}

		result = append(result, schedule)
	}

	return result, nil
}
