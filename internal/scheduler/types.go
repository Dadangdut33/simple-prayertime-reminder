package scheduler

import (
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
