package prayersync

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/clock"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
)

type Status struct {
	Enabled      bool                 `json:"enabled"`
	Syncing      bool                 `json:"syncing"`
	TodayActive  bool                 `json:"todayActive"`
	LastSync     string               `json:"lastSync"`
	NextSync     string               `json:"nextSync"`
	LastError    string               `json:"lastError"`
	Source       string               `json:"source"`
	APIEndpoint  string               `json:"apiEndpoint"`
	MethodName   string               `json:"methodName"`
	FromDate     string               `json:"fromDate"`
	ThroughDate  string               `json:"throughDate"`
	TodayOffsets prayer.PrayerOffsets `json:"todayOffsets"`
}

type diskCache struct {
	Key       string    `json:"key"`
	LastSync  time.Time `json:"lastSync"`
	Reference reference `json:"reference"`
}

// Manager keeps networking outside schedule reads and the reminder timing loop.
type Manager struct {
	mu              sync.Mutex
	prayer          *prayer.Service
	baseline        *prayer.Service
	config          Config
	calculation     prayer.PrayerConfig
	cache           diskCache
	path            string
	client          *http.Client
	endpoint        string
	myquranEndpoint string
	jakimEndpoint   string
	diyanetEndpoint string
	muisEndpoint    string
	now             func() time.Time
	lastAttempt     time.Time
	nextAttempt     time.Time
	lastError       string
	running         bool
	generation      uint64
	wake            chan struct{}
	onUpdate        func()
}

func New(svc *prayer.Service, path string, onUpdate func()) *Manager {
	m := &Manager{
		prayer: svc, baseline: prayer.NewService(), path: path, onUpdate: onUpdate, now: clock.Now,
		client: &http.Client{Timeout: 20 * time.Second}, endpoint: "https://api.aladhan.com/v1",
		myquranEndpoint: "https://api.myquran.com/v3",
		jakimEndpoint:   "https://www.e-solat.gov.my/index.php",
		diyanetEndpoint: "https://ezanvakti.emushaf.net",
		muisEndpoint:    "https://data.gov.sg/api/action/datastore_search",
		wake:            make(chan struct{}, 1), config: DefaultConfig(),
	}
	if data, err := os.ReadFile(path); err == nil && len(data) <= 2<<20 {
		_ = json.Unmarshal(data, &m.cache)
	}
	return m
}

func cacheKey(cfg prayer.PrayerConfig, online Config) string {
	cfg.Offsets = prayer.PrayerOffsets{}
	cfg.AutoOffsetEnabled = false
	data, _ := json.Marshal(struct {
		Calculation prayer.PrayerConfig
		Method      int
		Provider    string
		CityID      string
		RegionID    string `json:",omitempty"`
	}{cfg, online.Method, online.Provider, online.CityID, online.RegionID})
	return fmt.Sprintf("%x", sha256.Sum256(data))
}

func (m *Manager) Configure(cfg prayer.PrayerConfig, online Config) {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := cacheKey(cfg, online)
	changed := cacheKey(m.calculation, m.config) != key || m.config.Enabled != online.Enabled
	intervalChanged := m.config.IntervalHours != online.IntervalHours
	startupChanged := !m.config.OnStartup && online.OnStartup
	m.calculation, m.config = cfg, online
	if changed {
		base := cfg
		base.AutoOffsetEnabled = false
		base.Offsets = prayer.PrayerOffsets{}
		m.baseline.SetConfig(base)
		m.generation++
		m.lastError = ""
		m.prayer.ClearOnlineSchedules()
	}
	if m.cache.Key != key || !m.validCache(cfg) {
		m.cache = diskCache{}
	}
	if online.Enabled && m.cache.Key == key {
		m.prayer.SetOnlineSchedules(cfg, m.cache.Reference.Days)
	}
	if changed || intervalChanged || startupChanged {
		m.nextAttempt = time.Time{}
		if online.Enabled && online.IntervalHours > 0 {
			m.nextAttempt = m.now().Add(time.Duration(online.IntervalHours) * time.Hour)
		}
		if online.Enabled && online.OnStartup && (changed || startupChanged) {
			m.nextAttempt = m.now()
		}
		select {
		case m.wake <- struct{}{}:
		default:
		}
	}
}

func (m *Manager) validCache(cfg prayer.PrayerConfig) bool {
	loc, err := time.LoadLocation(cfg.Timezone)
	if err != nil || len(m.cache.Reference.Days) == 0 || len(m.cache.Reference.Days) > 62 || m.cache.LastSync.IsZero() {
		return false
	}
	for key, day := range m.cache.Reference.Days {
		if key != day.Date || validateDay(day, loc) != nil {
			return false
		}
	}
	return true
}

// Run is called once for the app lifetime; cancellation stops ticks and HTTP work.
func (m *Manager) Run(ctx context.Context) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		m.mu.Lock()
		due := m.config.Enabled && !m.nextAttempt.IsZero() && !m.now().Before(m.nextAttempt)
		m.mu.Unlock()
		if due {
			_, _ = m.Sync(ctx)
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		case <-m.wake:
		}
	}
}

func (m *Manager) Sync(ctx context.Context) (Status, error) {
	m.mu.Lock()
	if !m.config.Enabled || m.running {
		m.mu.Unlock()
		return m.Status(), fmt.Errorf("enable auto offset first, or wait for the current sync")
	}
	cfg, online, generation := m.calculation, m.config, m.generation
	m.running = true
	m.lastAttempt = m.now()
	m.mu.Unlock()

	requestCtx, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()
	ref := reference{Days: make(map[string]prayer.DaySchedule)}
	coverageWarning := ""
	loc, err := time.LoadLocation(cfg.Timezone)
	if err == nil {
		err = online.Validate()
	}
	if err == nil && online.Provider == "diyanet" {
		ref, err = m.fetchDiyanet(requestCtx, cfg, online)
	} else if err == nil {
		today := m.now().In(loc)
		first := time.Date(today.Year(), today.Month(), 1, 0, 0, 0, 0, loc)
		// Fetch two months so next-day Fajr and month rollover also have references.
		for i := 0; i < 2; i++ {
			var month reference
			switch online.Provider {
			case "myquran":
				month, err = fetchMyQuranMonth(requestCtx, m.client, m.myquranEndpoint, cfg, online.CityID, first.AddDate(0, i, 0))
			case "jakim":
				month, err = fetchJakimMonth(requestCtx, m.client, m.jakimEndpoint, cfg, online.CityID, first.AddDate(0, i, 0))
			case "muis":
				month, err = fetchMUISMonth(requestCtx, m.client, m.muisEndpoint, cfg, first.AddDate(0, i, 0))
			default:
				month, err = fetchMonth(requestCtx, m.client, m.endpoint, cfg, online.Method, first.AddDate(0, i, 0))
			}
			if err != nil {
				if i == 1 && (online.Provider == "muis" || online.Provider == "jakim") && requestCtx.Err() == nil {
					coverageWarning = ref.MethodName + ": only the current month was refreshed; next month is unavailable. Other dates use local calculations."
					err = nil
				}
				break
			}
			if ref.MethodName != "" && ref.MethodName != month.MethodName {
				err = fmt.Errorf("inconsistent online method across months")
				break
			}
			ref.MethodName = month.MethodName
			ref.Source = month.Source
			if ref.APIEndpoint == "" {
				ref.APIEndpoint = month.APIEndpoint
			}
			for date, day := range month.Days {
				ref.Days[date] = day
			}
		}
	}

	m.mu.Lock()
	m.running = false
	if generation != m.generation || !m.config.Enabled {
		m.mu.Unlock()
		return m.Status(), fmt.Errorf("settings changed during sync; downloaded times were discarded")
	}
	m.nextAttempt = time.Time{}
	if m.config.IntervalHours > 0 {
		m.nextAttempt = m.now().Add(time.Duration(m.config.IntervalHours) * time.Hour)
	}
	updated := false
	if err == nil {
		cache := diskCache{Key: cacheKey(cfg, online), LastSync: m.now(), Reference: ref}
		// Persist before replacing the last successful reference. Failed refreshes
		// leave the previous dated cache in use; local calculations cover other dates.
		if m.path != "" {
			err = saveCache(m.path, cache)
		}
		if err == nil {
			m.cache = cache
			updated = m.prayer.SetOnlineSchedules(cfg, ref.Days)
		}
	}
	m.lastError = coverageWarning
	if err != nil {
		m.lastError = err.Error()
	}
	m.mu.Unlock()
	if updated && m.onUpdate != nil {
		m.onUpdate()
	}
	return m.Status(), err
}

func saveCache(path string, cache diskCache) error {
	data, err := json.Marshal(cache)
	if err != nil {
		return err
	}
	if err = os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return err
	}
	file, err := os.CreateTemp(filepath.Dir(path), "prayer-offsets-*.tmp")
	if err != nil {
		return err
	}
	defer os.Remove(file.Name())
	if _, err = file.Write(data); err != nil {
		file.Close()
		return err
	}
	if err = file.Close(); err != nil {
		return err
	}
	return os.Rename(file.Name(), path)
}

func (m *Manager) Status() Status {
	m.mu.Lock()
	status := Status{
		Enabled: m.config.Enabled, Syncing: m.running, LastError: m.lastError,
		Source: m.cache.Reference.Source, APIEndpoint: m.cache.Reference.APIEndpoint, MethodName: m.cache.Reference.MethodName,
	}
	if !m.cache.LastSync.IsZero() {
		status.LastSync = m.cache.LastSync.Format(time.RFC3339)
	}
	if m.config.Enabled && !m.nextAttempt.IsZero() {
		status.NextSync = m.nextAttempt.Format(time.RFC3339)
	}
	dates := make([]string, 0, len(m.cache.Reference.Days))
	for date := range m.cache.Reference.Days {
		dates = append(dates, date)
	}
	sort.Strings(dates)
	if len(dates) > 0 {
		status.FromDate, status.ThroughDate = dates[0], dates[len(dates)-1]
	}
	cfg := m.calculation
	loc, err := time.LoadLocation(cfg.Timezone)
	var today time.Time
	if err == nil {
		today = m.now().In(loc)
	}
	day, found := m.cache.Reference.Days[today.Format(time.DateOnly)]
	status.TodayActive = status.Enabled && found
	m.mu.Unlock()
	if status.TodayActive {
		base, err := m.baseline.GetScheduleForDate(today)
		if err == nil {
			status.TodayOffsets = prayer.PrayerOffsets{
				Fajr: day.Fajr.Sub(base.Fajr).Minutes(), Sunrise: day.Sunrise.Sub(base.Sunrise).Minutes(),
				Zuhr: day.Zuhr.Sub(base.Zuhr).Minutes(), Asr: day.Asr.Sub(base.Asr).Minutes(),
				Maghrib: day.Maghrib.Sub(base.Maghrib).Minutes(), Isha: day.Isha.Sub(base.Isha).Minutes(),
			}
		}
	}
	return status
}
