package appservice

import (
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/audio"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/clock"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/notification"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/settings"
)

type ReminderTestSnapshot struct {
	Timezone       string            `json:"timezone"`
	CurrentTime    string            `json:"currentTime"`
	SimulatedTime  string            `json:"simulatedTime"`
	PrayerName     string            `json:"prayerName"`
	PrayerTime     string            `json:"prayerTime"`
	OffsetSeconds  int               `json:"offsetSeconds"`
	State          string            `json:"state"`
	MinutesLeft    int               `json:"minutesLeft"`
	NextPrayerName string            `json:"nextPrayerName"`
	NextPrayerTime string            `json:"nextPrayerTime"`
	Schedule       map[string]string `json:"schedule"`
}

func normalizePrayerName(input string) string {
	normalized := strings.TrimSpace(strings.ToLower(input))
	switch normalized {
	case "fajr":
		return "Fajr"
	case "sunrise":
		return "Sunrise"
	case "zuhr", "dhuhr", "dzuhur", "duhr":
		return "Zuhr"
	case "asr":
		return "Asr"
	case "maghrib":
		return "Maghrib"
	case "isha", "isya":
		return "Isha"
	default:
		return "Fajr"
	}
}

func getPrayerTimeFromSchedule(s prayer.DaySchedule, prayerName string) (time.Time, error) {
	switch prayerName {
	case "Fajr":
		return s.Fajr, nil
	case "Sunrise":
		return s.Sunrise, nil
	case "Zuhr":
		return s.Zuhr, nil
	case "Asr":
		return s.Asr, nil
	case "Maghrib":
		return s.Maghrib, nil
	case "Isha":
		return s.Isha, nil
	default:
		return time.Time{}, fmt.Errorf("unknown prayer: %s", prayerName)
	}
}

func scheduleToMap(s prayer.DaySchedule) map[string]string {
	return map[string]string{
		"Fajr":    s.Fajr.Format(time.RFC3339),
		"Sunrise": s.Sunrise.Format(time.RFC3339),
		"Zuhr":    s.Zuhr.Format(time.RFC3339),
		"Asr":     s.Asr.Format(time.RFC3339),
		"Maghrib": s.Maghrib.Format(time.RFC3339),
		"Isha":    s.Isha.Format(time.RFC3339),
	}
}

func toReminderNotificationSettings(cfg settings.NotificationSettings) *notification.ReminderNotificationSettings {
	return &notification.ReminderNotificationSettings{
		PersistentReminder:   cfg.PersistentReminder,
		AutoDismissSeconds:   cfg.AutoDismissSeconds,
		AutoDismissAfterAdhan: cfg.AutoDismissAfterAdhan,
		PlayAdhan:            cfg.PlayAdhan,
		AdhanVolume:          cfg.AdhanVolume,
		AlwaysOnTop:          cfg.AlwaysOnTop,
		UseNativeNotification: cfg.UseNativeNotification,
		NativeNotificationSticky: cfg.NativeNotificationSticky,
		UseNativeDialog:      cfg.UseNativeDialog,
	}
}

func sameDay(a, b time.Time) bool {
	ay, am, ad := a.Date()
	by, bm, bd := b.Date()
	return ay == by && am == bm && ad == bd
}

func (s *Service) buildReminderTestSnapshot(prayerName string, offsetSeconds int, timezone string) (ReminderTestSnapshot, error) {
	cfg := BuildPrayerConfig(s.settingsSvc.Get())
	if timezone != "" {
		cfg.Timezone = timezone
	}
	prayerSvc := prayer.NewService()
	prayerSvc.SetConfig(cfg)

	loc, err := time.LoadLocation(cfg.Timezone)
	if err != nil {
		log.Warn("test reminder timezone load failed", "error", err, "timezone", cfg.Timezone)
		loc = time.UTC
	}
	now := clock.Now().In(loc)
	schedule, err := prayerSvc.GetScheduleForDate(now)
	if err != nil {
		log.Error("test reminder schedule failed", "error", err)
		return ReminderTestSnapshot{}, err
	}

	targetName := normalizePrayerName(prayerName)
	targetTime, err := getPrayerTimeFromSchedule(schedule, targetName)
	if err != nil || targetTime.IsZero() {
		next, nextErr := prayerSvc.GetNextPrayer(now)
		if nextErr != nil {
			log.Error("test reminder next prayer failed", "error", nextErr)
			return ReminderTestSnapshot{}, nextErr
		}
		targetName = next.Name
		targetTime = next.Time
	}

	simulatedNow := targetTime.Add(time.Duration(offsetSeconds) * time.Second)
	// If the simulated time crosses a day boundary, rebuild the schedule for that day.
	if !sameDay(simulatedNow.In(loc), now) {
		schedule, err = prayerSvc.GetScheduleForDate(simulatedNow)
		if err != nil {
			log.Error("test reminder schedule day shift failed", "error", err)
			return ReminderTestSnapshot{}, err
		}
		targetTime, err = getPrayerTimeFromSchedule(schedule, targetName)
		if err != nil || targetTime.IsZero() {
			next, nextErr := prayerSvc.GetNextPrayer(simulatedNow)
			if nextErr != nil {
				log.Error("test reminder next prayer (day shift) failed", "error", nextErr)
				return ReminderTestSnapshot{}, nextErr
			}
			targetName = next.Name
			targetTime = next.Time
		}
		simulatedNow = targetTime.Add(time.Duration(offsetSeconds) * time.Second)
	}
	state := notification.StateOnTime
	if offsetSeconds < 0 {
		state = notification.StateBefore
	} else if offsetSeconds > 0 {
		state = notification.StateAfter
	}

	minutesLeft := 0
	if state == notification.StateBefore {
		minutesLeft = int(math.Ceil(float64(-offsetSeconds) / 60.0))
		if minutesLeft < 0 {
			minutesLeft = 0
		}
	}

	nextPrayer, err := prayerSvc.GetNextPrayer(simulatedNow)
	if err != nil {
		log.Error("test reminder next prayer failed", "error", err)
		return ReminderTestSnapshot{}, err
	}

	return ReminderTestSnapshot{
		Timezone:       cfg.Timezone,
		CurrentTime:    now.Format(time.RFC3339),
		SimulatedTime:  simulatedNow.Format(time.RFC3339),
		PrayerName:     targetName,
		PrayerTime:     targetTime.Format(time.RFC3339),
		OffsetSeconds:  offsetSeconds,
		State:          string(state),
		MinutesLeft:    minutesLeft,
		NextPrayerName: nextPrayer.Name,
		NextPrayerTime: nextPrayer.Time.Format(time.RFC3339),
		Schedule:       scheduleToMap(schedule),
	}, nil
}

func (s *Service) GetReminderTestSnapshot(prayerName string, offsetSeconds int, timezone string) (ReminderTestSnapshot, error) {
	snapshot, err := s.buildReminderTestSnapshot(prayerName, offsetSeconds, timezone)
	if err != nil {
		return ReminderTestSnapshot{}, err
	}
	log.Info("test snapshot built", "prayer", snapshot.PrayerName, "offsetSeconds", snapshot.OffsetSeconds)
	return snapshot, nil
}

func (s *Service) SyncReminderTestWindow(prayerName string, offsetSeconds int, timezone string, live bool) (ReminderTestSnapshot, error) {
	snapshot, err := s.buildReminderTestSnapshot(prayerName, offsetSeconds, timezone)
	if err != nil {
		log.Error("sync test reminder failed", "error", err)
		return ReminderTestSnapshot{}, err
	}

	offsetMinutes := int(math.Round(float64(snapshot.OffsetSeconds) / 60.0))
	if s.notifSvc != nil {
		cfg := s.settingsSvc.Get()
		s.notifSvc.UpdateTestState(
			notification.WindowState(snapshot.State),
			snapshot.MinutesLeft,
			snapshot.PrayerName,
			offsetMinutes,
			live,
			cfg.Language,
			toReminderNotificationSettings(cfg.Notification),
		)
	}
	log.Info("test reminder synced", "prayer", snapshot.PrayerName, "offsetSeconds", snapshot.OffsetSeconds, "live", live)

	return snapshot, nil
}

func (s *Service) TriggerReminderTest(prayerName string, offsetSeconds int, timezone string, live bool) (ReminderTestSnapshot, error) {
	snapshot, err := s.buildReminderTestSnapshot(prayerName, offsetSeconds, timezone)
	if err != nil {
		log.Error("trigger test reminder failed", "error", err)
		return ReminderTestSnapshot{}, err
	}

	offsetMinutes := int(math.Round(float64(snapshot.OffsetSeconds) / 60.0))
	cfg := s.settingsSvc.Get()
	if s.notifSvc != nil {
		s.notifSvc.ShowTestReminder(notification.ReminderInfo{
			PrayerName:    snapshot.PrayerName,
			State:         notification.WindowState(snapshot.State),
			MinutesLeft:   snapshot.MinutesLeft,
			OffsetMinutes: offsetMinutes,
			Live:          live,
			Language:      cfg.Language,
			Notification:  toReminderNotificationSettings(cfg.Notification),
		})
	}
	log.Info("test reminder triggered", "prayer", snapshot.PrayerName, "offsetSeconds", snapshot.OffsetSeconds, "live", live)

	if !cfg.Notification.PersistentReminder && cfg.Notification.AutoDismissSeconds > 0 {
		delay := time.Duration(cfg.Notification.AutoDismissSeconds) * time.Second
		if snapshot.State == string(notification.StateOnTime) &&
			cfg.Notification.PlayAdhan &&
			cfg.Notification.AutoDismissAfterAdhan {
			go s.closeTestAfterAdhan(delay)
		} else {
			go s.closeTestAfterDelay(delay)
		}
	}

	return snapshot, nil
}

func (s *Service) closeTestAfterDelay(delay time.Duration) {
	time.Sleep(delay)
	if s.notifSvc != nil {
		s.notifSvc.CloseTestReminder()
	}
}

func (s *Service) closeTestAfterAdhan(delay time.Duration) {
	if s.audioSvc == nil {
		s.closeTestAfterDelay(delay)
		return
	}

	started := waitForAudioState(s.audioSvc, true, 5*time.Second)
	if !started {
		s.closeTestAfterDelay(delay)
		return
	}

	_ = waitForAudioState(s.audioSvc, false, 15*time.Minute)
	s.closeTestAfterDelay(delay)
}

func waitForAudioState(audioSvc *audio.Service, target bool, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	ticker := time.NewTicker(250 * time.Millisecond)
	defer ticker.Stop()

	for {
		if audioSvc != nil && audioSvc.IsPlaying() == target {
			return true
		}
		if time.Now().After(deadline) {
			return false
		}
		<-ticker.C
	}
}
