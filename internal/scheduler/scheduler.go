package scheduler

import (
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/audio"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/clock"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/notification"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/settings"
)

const (
	audioStartTimeout    = 5 * time.Second
	audioStopTimeout     = 15 * time.Minute
	audioPollInterval    = 250 * time.Millisecond
	ontimeGrace          = 20 * time.Second
	clockMonitorInterval = 30 * time.Second
	clockJumpThreshold   = 90 * time.Second
)

func toReminderNotificationSettings(cfg settings.NotificationSettings) *notification.ReminderNotificationSettings {
	return &notification.ReminderNotificationSettings{
		PersistentReminder:       cfg.PersistentReminder,
		AutoDismissSeconds:       cfg.AutoDismissSeconds,
		AutoDismissAfterAdhan:    cfg.AutoDismissAfterAdhan,
		PlayAdhan:                cfg.PlayAdhan,
		AdhanVolume:              cfg.AdhanVolume,
		CustomAdhanPath:          cfg.CustomAdhanPath,
		CustomAdhanFajrPath:      cfg.CustomAdhanFajrPath,
		AlwaysOnTop:              cfg.AlwaysOnTop,
		UseNativeNotification:    cfg.UseNativeNotification,
		NativeNotificationSticky: cfg.NativeNotificationSticky,
		UseNativeDialog:          cfg.UseNativeDialog,
	}
}

// NewService creates a new Scheduler service
func NewService(p *prayer.Service, a *audio.Service, n *notification.Service) *Service {
	return &Service{
		prayerSvc:      p,
		audioSvc:       a,
		notifSvc:       n,
		stopCh:         make(chan struct{}),
		prayerTickSeen: make(map[string]struct{}),
		suppressed:     make(map[string]struct{}),
	}
}

// Start begins scheduling, replacing any previous generation of timers.
func (svc *Service) Start(cfg settings.Settings) {
	svc.UpdateConfig(cfg)
	svc.startClockMonitor()
}

// Stop cancels the current generation. Each timer retains its own stop channel.
func (svc *Service) Stop() {
	svc.lifecycleMu.Lock()
	defer svc.lifecycleMu.Unlock()
	if svc.stopCh != nil {
		close(svc.stopCh)
		svc.stopCh = nil
	}
}

func (svc *Service) UpdateConfig(cfg settings.Settings) {
	svc.lifecycleMu.Lock()
	defer svc.lifecycleMu.Unlock()
	svc.restartLocked(cfg)
}

func (svc *Service) restartLocked(cfg settings.Settings) {
	svc.setConfig(cfg)
	if svc.stopCh != nil {
		close(svc.stopCh)
	}
	svc.stopCh = make(chan struct{})
	go svc.run(svc.stopCh, cfg)
}

func (svc *Service) refresh() {
	svc.lifecycleMu.Lock()
	defer svc.lifecycleMu.Unlock()
	if svc.stopCh != nil {
		svc.restartLocked(svc.getConfig())
	}
}
func (svc *Service) setConfig(cfg settings.Settings) {
	svc.cfgMu.Lock()
	svc.cfg = cfg
	svc.cfgMu.Unlock()
}

func (svc *Service) getConfig() settings.Settings {
	svc.cfgMu.RLock()
	defer svc.cfgMu.RUnlock()
	return svc.cfg
}

func (svc *Service) startClockMonitor() {
	svc.monitorOnce.Do(func() {
		go svc.monitorClockChanges()
	})
}

func (svc *Service) monitorClockChanges() {
	ticker := time.NewTicker(clockMonitorInterval)
	defer ticker.Stop()

	var previous time.Time
	for range ticker.C {
		cfg := svc.getConfig()
		loc := resolveScheduleLocation(cfg)
		now := clock.Now().In(loc)
		if previous.IsZero() {
			previous = now
			continue
		}

		elapsed := now.Sub(previous)
		drift := elapsed - clockMonitorInterval
		if drift < 0 {
			drift = -drift
		}
		if drift > clockJumpThreshold {
			log.Warn("clock jump detected, rescheduling reminders", "previous", previous, "current", now, "elapsed", elapsed)
			previous = now
			svc.refresh()
			continue
		}

		previous = now
	}
}

func (svc *Service) run(stop <-chan struct{}, cfg settings.Settings) {
	loc := resolveScheduleLocation(cfg)
	for {
		log.Info("scheduler day cycle start")
		svc.scheduleDayReminders(stop, cfg, loc)

		// Wait until next midnight (or stop signal)
		now := clock.Now().In(loc)
		nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 5, 0, loc)
		wait := nextMidnight.Sub(now)
		if wait < 0 {
			wait = time.Second
		}
		select {
		case <-stop:
			log.Info("scheduler stopped")
			return
		case <-time.After(wait):
			// loop again for the new day
		}
	}
}

func (svc *Service) scheduleDayReminders(stop <-chan struct{}, cfg settings.Settings, loc *time.Location) {
	sched, err := svc.prayerSvc.GetTodaySchedule()
	if err != nil {
		log.Error("schedule load failed", "error", err)
		return
	}

	notifCfg := cfg.Notification

	entries := []prayerEntry{
		{name: "Fajr", t: sched.Fajr, isFajr: true, notifSettings: notifCfg.Prayers.Fajr},
		{name: "Sunrise", t: sched.Sunrise, isFajr: false, notifSettings: notifCfg.Prayers.Sunrise},
		{name: "Zuhr", t: sched.Zuhr, isFajr: false, notifSettings: notifCfg.Prayers.Zuhr},
		{name: "Asr", t: sched.Asr, isFajr: false, notifSettings: notifCfg.Prayers.Asr},
		{name: "Maghrib", t: sched.Maghrib, isFajr: false, notifSettings: notifCfg.Prayers.Maghrib},
		{name: "Isha", t: sched.Isha, isFajr: false, notifSettings: notifCfg.Prayers.Isha},
	}

	now := clock.Now().In(loc)
	svc.resetPrayerTickForDay(sched.Date)
	svc.resetSuppressedForDay(sched.Date)
	for _, entry := range entries {
		if !entry.notifSettings.Enabled || entry.t.IsZero() {
			continue
		}
		e := entry // capture

		// Schedule "before" reminder
		beforeTime := e.t.Add(-time.Duration(e.notifSettings.BeforeMinutes) * time.Minute)
		if beforeTime.After(now) {
			delay := beforeTime.Sub(now)
			log.Info("schedule before reminder", "prayer", e.name, "delay", delay)
			go svc.fireAfterDelay(stop, e, notification.StateBefore, delay, notifCfg, cfg.Language)
		}

		// Schedule "on time" event
		if e.t.After(now) {
			delay := e.t.Sub(now)
			log.Info("schedule on-time reminder", "prayer", e.name, "delay", delay)
			go svc.fireAfterDelay(stop, e, notification.StateOnTime, delay, notifCfg, cfg.Language)
		} else {
			elapsed := now.Sub(e.t)
			if elapsed >= 0 && elapsed <= ontimeGrace {
				log.Info("fire on-time reminder immediately", "prayer", e.name, "elapsed", elapsed)
				go svc.fireAfterDelay(stop, e, notification.StateOnTime, 0, notifCfg, cfg.Language)
			}
		}

		// Schedule "after" reminder
		if e.notifSettings.AfterMinutes > 0 {
			afterTime := e.t.Add(time.Duration(e.notifSettings.AfterMinutes) * time.Minute)
			if afterTime.After(now) {
				delay := afterTime.Sub(now)
				log.Info("schedule after reminder", "prayer", e.name, "delay", delay)
				go svc.fireAfterDelay(stop, e, notification.StateAfter, delay, notifCfg, cfg.Language)
			}
		}
	}
}

func resolveScheduleLocation(cfg settings.Settings) *time.Location {
	if cfg.Location.Timezone == "" {
		return time.UTC
	}
	loc, err := time.LoadLocation(cfg.Location.Timezone)
	if err != nil {
		log.Warn("scheduler timezone load failed, using UTC", "timezone", cfg.Location.Timezone, "error", err)
		return time.UTC
	}
	return loc
}

func (svc *Service) resetPrayerTickForDay(day string) {
	if day == "" {
		return
	}
	svc.prayerTickMu.Lock()
	if _, ok := svc.prayerTickSeen["_day:"+day]; ok {
		svc.prayerTickMu.Unlock()
		return
	}
	svc.prayerTickSeen = make(map[string]struct{})
	svc.prayerTickSeen["_day:"+day] = struct{}{}
	svc.prayerTickMu.Unlock()
}

func (svc *Service) markPrayerTick(name string, at time.Time) bool {
	if name == "" || at.IsZero() {
		return false
	}
	key := name + "|" + at.Format("2006-01-02")
	svc.prayerTickMu.Lock()
	if _, ok := svc.prayerTickSeen[key]; ok {
		svc.prayerTickMu.Unlock()
		return false
	}
	svc.prayerTickSeen[key] = struct{}{}
	svc.prayerTickMu.Unlock()
	return true
}

func (svc *Service) SuppressPrayer(prayerName string, day string) {
	if prayerName == "" || day == "" {
		return
	}
	key := prayerName + "|" + day
	svc.suppressMu.Lock()
	svc.suppressed[key] = struct{}{}
	svc.suppressMu.Unlock()
}

func (svc *Service) isSuppressed(prayerName string, at time.Time) bool {
	if prayerName == "" || at.IsZero() {
		return false
	}
	key := prayerName + "|" + at.Format("2006-01-02")
	svc.suppressMu.Lock()
	_, ok := svc.suppressed[key]
	svc.suppressMu.Unlock()
	return ok
}

func (svc *Service) resetSuppressedForDay(day string) {
	if day == "" {
		return
	}
	svc.suppressMu.Lock()
	if _, ok := svc.suppressed["_day:"+day]; ok {
		svc.suppressMu.Unlock()
		return
	}
	svc.suppressed = make(map[string]struct{})
	svc.suppressed["_day:"+day] = struct{}{}
	svc.suppressMu.Unlock()
}

func (svc *Service) fireAfterDelay(
	stop <-chan struct{},
	entry prayerEntry,
	state notification.WindowState,
	delay time.Duration,
	notifCfg settings.NotificationSettings,
	language string,
) {
	select {
	case <-stop:
		return
	case <-time.After(delay):
	}
	// A zero-delay timer and cancellation can become ready together.
	select {
	case <-stop:
		return
	default:
	}

	minutesLeft := 0
	offsetMinutes := 0
	switch state {
	case notification.StateBefore:
		minutesLeft = entry.notifSettings.BeforeMinutes
		offsetMinutes = -entry.notifSettings.BeforeMinutes
	case notification.StateAfter:
		offsetMinutes = entry.notifSettings.AfterMinutes
	}

	if svc.isSuppressed(entry.name, entry.t) {
		log.Info("reminder suppressed", "prayer", entry.name, "state", state)
		return
	}
	// Resynchronizing a timetable must not fire an already delivered state again.
	if !svc.markPrayerTick(entry.name+"|"+string(state), entry.t) {
		return
	}

	triggerID := svc.notifSvc.ShowReminder(notification.ReminderInfo{
		PrayerName:    entry.name,
		State:         state,
		MinutesLeft:   minutesLeft,
		OffsetMinutes: offsetMinutes,
		Language:      language,
		Notification:  toReminderNotificationSettings(notifCfg),
	})
	log.Info("reminder fired", "prayer", entry.name, "state", state, "offsetMinutes", offsetMinutes)

	if state == notification.StateOnTime {
		if svc.markPrayerTick(entry.name, entry.t) {
			svc.notifSvc.EmitPrayerUpdate(entry.name, state)
		}
	}

	if !notifCfg.PersistentReminder && notifCfg.AutoDismissSeconds > 0 {
		delay := time.Duration(notifCfg.AutoDismissSeconds) * time.Second
		if svc.shouldWaitForAdhan(state, notifCfg) {
			go svc.closeAfterAdhan(stop, delay, triggerID)
		} else {
			go svc.closeAfterDelay(stop, delay, triggerID)
		}
	}
}

func (svc *Service) closeAfterDelay(stop <-chan struct{}, delay time.Duration, triggerID int64) {
	select {
	case <-stop:
		return
	case <-time.After(delay):
	}
	if triggerID != 0 && (svc.notifSvc == nil || !svc.notifSvc.IsReminderTriggerActive(triggerID)) {
		log.Info("skip stale auto dismiss reminder", "triggerId", triggerID)
		return
	}
	log.Info("auto dismiss reminder", "delay", delay)
	svc.notifSvc.CloseReminder()
}

func (svc *Service) shouldWaitForAdhan(state notification.WindowState, cfg settings.NotificationSettings) bool {
	return state == notification.StateOnTime && cfg.PlayAdhan && cfg.AutoDismissAfterAdhan
}

func (svc *Service) closeAfterAdhan(stop <-chan struct{}, delay time.Duration, triggerID int64) {
	if svc.audioSvc == nil {
		svc.closeAfterDelay(stop, delay, triggerID)
		return
	}

	started := svc.waitForAudioState(stop, true, audioStartTimeout, triggerID)
	if !started {
		svc.closeAfterDelay(stop, delay, triggerID)
		return
	}

	_ = svc.waitForAudioState(stop, false, audioStopTimeout, triggerID)
	if svc.notifSvc != nil && triggerID != 0 {
		svc.notifSvc.EmitAutoDismissCountdown(triggerID, int(delay/time.Second), false)
	}
	svc.closeAfterDelay(stop, delay, triggerID)
}

func (svc *Service) waitForAudioState(stop <-chan struct{}, target bool, timeout time.Duration, triggerID int64) bool {
	deadline := time.Now().Add(timeout)
	ticker := time.NewTicker(audioPollInterval)
	defer ticker.Stop()

	for {
		if triggerID != 0 && (svc.notifSvc == nil || !svc.notifSvc.IsReminderTriggerActive(triggerID)) {
			return false
		}
		if svc.audioSvc != nil && svc.audioSvc.IsPlaying() == target {
			return true
		}
		if time.Now().After(deadline) {
			return false
		}
		select {
		case <-stop:
			return false
		case <-ticker.C:
		}
	}
}
