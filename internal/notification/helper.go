package notification

import "fmt"

func (svc *Service) buildReminderText(info ReminderInfo) (string, string) {
	prayer := info.PrayerName
	switch info.State {
	case StateOnTime:
		return "Time for prayer", fmt.Sprintf("It's time for %s prayer.", prayer)
	case StateAfter:
		offset := info.OffsetMinutes
		if offset <= 0 {
			offset = info.MinutesLeft
		}
		if offset < 0 {
			offset = -offset
		}
		return "Prayer reminder", fmt.Sprintf("%d minutes have passed since %s prayer.", offset, prayer)
	default:
		minutes := info.MinutesLeft
		if minutes <= 0 {
			minutes = -info.OffsetMinutes
		}
		if minutes < 0 {
			minutes = -minutes
		}
		return "Prayer reminder", fmt.Sprintf("%s starts in %d minutes.", prayer, minutes)
	}
}

func (svc *Service) stopAudio() {
	if svc.audioSvc != nil {
		log.Info("stop adhan requested")
		svc.audioSvc.Stop()
	}
}
