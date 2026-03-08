package scheduler

import (
	"log"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/audio"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/notification"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/settings"
)

// prayerEntry holds scheduling info for a single prayer fire-time
type prayerEntry struct {
	name          string
	t             time.Time
	isFajr        bool
	notifSettings settings.PrayerNotificationSetting
}

// Service schedules prayer reminders
type Service struct {
	prayerSvc *prayer.Service
	audioSvc  *audio.Service
	notifSvc  *notification.Service
	stopCh    chan struct{}
}

// NewService creates a new Scheduler service
func NewService(p *prayer.Service, a *audio.Service, n *notification.Service) *Service {
	return &Service{
		prayerSvc: p,
		audioSvc:  a,
		notifSvc:  n,
		stopCh:    make(chan struct{}),
	}
}

// Start begins the scheduling loop, which re-evaluates each midnight
func (svc *Service) Start(cfg settings.Settings) {
	go svc.run(cfg)
}

// Stop halts scheduling
func (svc *Service) Stop() {
	close(svc.stopCh)
	svc.stopCh = make(chan struct{})
}

// UpdateConfig restarts scheduling with new settings
func (svc *Service) UpdateConfig(cfg settings.Settings) {
	select {
	case <-svc.stopCh: // already stopped, ignore
	default:
		close(svc.stopCh)
	}
	svc.stopCh = make(chan struct{})
	go svc.run(cfg)
}

func (svc *Service) run(cfg settings.Settings) {
	for {
		svc.scheduleDayReminders(cfg)

		// Wait until next midnight (or stop signal)
		now := time.Now()
		nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 5, 0, now.Location())
		select {
		case <-svc.stopCh:
			return
		case <-time.After(time.Until(nextMidnight)):
			// loop again for the new day
		}
	}
}

func (svc *Service) scheduleDayReminders(cfg settings.Settings) {
	sched, err := svc.prayerSvc.GetTodaySchedule()
	if err != nil {
		log.Printf("scheduler: failed to get today's schedule: %v", err)
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

	now := time.Now()
	for _, entry := range entries {
		if !entry.notifSettings.Enabled || entry.t.IsZero() {
			continue
		}
		e := entry // capture

		// Schedule "before" reminder
		beforeTime := e.t.Add(-time.Duration(e.notifSettings.BeforeMinutes) * time.Minute)
		if beforeTime.After(now) {
			delay := time.Until(beforeTime)
			go svc.fireAfterDelay(e, notification.StateBefore, delay, notifCfg)
		}

		// Schedule "on time" event
		if e.t.After(now) {
			delay := time.Until(e.t)
			go svc.fireAfterDelay(e, notification.StateOnTime, delay, notifCfg)
		}

		// Schedule "after" reminder
		afterTime := e.t.Add(time.Duration(e.notifSettings.AfterMinutes) * time.Minute)
		if afterTime.After(now) {
			delay := time.Until(afterTime)
			go svc.closeAfterDelay(delay)
		}
	}
}

func (svc *Service) fireAfterDelay(
	entry prayerEntry,
	state notification.WindowState,
	delay time.Duration,
	notifCfg settings.NotificationSettings,
) {
	select {
	case <-svc.stopCh:
		return
	case <-time.After(delay):
	}

	minutesLeft := 0
	if state == notification.StateBefore {
		minutesLeft = entry.notifSettings.BeforeMinutes
	}

	svc.notifSvc.ShowReminder(notification.ReminderInfo{
		PrayerName:  entry.name,
		State:       state,
		MinutesLeft: minutesLeft,
	})

	if state == notification.StateOnTime && notifCfg.PlayAdhan {
		if err := svc.audioSvc.Play(entry.isFajr, notifCfg.AdhanVolume); err != nil {
			log.Printf("scheduler: failed to play adhan: %v", err)
		}
	}
}

func (svc *Service) closeAfterDelay(delay time.Duration) {
	select {
	case <-svc.stopCh:
		return
	case <-time.After(delay):
	}
	svc.audioSvc.Stop()
	svc.notifSvc.CloseReminder()
}
