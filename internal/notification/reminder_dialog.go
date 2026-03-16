package notification

import (
	"strings"
)

func (svc *Service) showNativeDialog(info ReminderInfo) {
	title, body := svc.buildReminderText(info)
	dialog := svc.app.Dialog.Question().SetTitle(title).SetMessage(body)

	dismiss := dialog.AddButton("Dismiss")
	dismiss.OnClick(func() {
		svc.stopAudio()
	})

	dialog.Show()
}

func (svc *Service) enqueueNativeDialog(info ReminderInfo) {
	svc.mu.Lock()
	closed := svc.dialogClosed
	svc.mu.Unlock()
	if closed {
		log.Info("native dialog queue closed, skipping")
		return
	}
	select {
	case svc.dialogCh <- info:
		log.Info("native dialog queued")
	default:
		log.Info("native dialog already in progress, skipping")
	}
}

func (svc *Service) dialogWorker() {
	for info := range svc.dialogCh {
		svc.showNativeDialog(info)
	}
}

func (svc *Service) playAdhanForDialog(info ReminderInfo, notif *ReminderNotificationSettings) {
	if svc.audioSvc == nil || notif == nil {
		return
	}
	if !notif.PlayAdhan || info.State != StateOnTime {
		return
	}
	if strings.EqualFold(info.PrayerName, "Sunrise") {
		return
	}
	isFajr := strings.EqualFold(info.PrayerName, "Fajr")
	if err := svc.audioSvc.Play(isFajr, notif.AdhanVolume); err != nil {
		log.Error("dialog adhan play failed", "error", err, "fajr", isFajr)
	}
}
