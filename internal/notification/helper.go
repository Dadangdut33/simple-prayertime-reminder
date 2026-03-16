package notification

import "fmt"

type reminderQuote struct {
	quote string
	ref   string
}

func reminderQuoteByLang(lang string, withQuote bool) reminderQuote {
	if !withQuote {
		return reminderQuote{}
	}
	switch lang {
	case "id":
		return reminderQuote{
			quote: "Umm Farwah berkata: Rasulullah SAW ditanya: \"Amal apakah yang paling utama?\" Beliau menjawab: \"Shalat di awal waktunya.\" Al-Khuza'i menyebutkan dalam haditsnya dari bibinya yang bernama Umm Farwah yang telah membai'at Nabi SAW: Beliau ditanya.",
			ref:   "Referensi: Hadits Sunan Abu Dawud No. 426 - Kitab Shalat",
		}
	default:
		return reminderQuote{
			quote: "Narrated Umm Farwah:\n\nThe Messenger of Allah (ﷺ) was asked: Which of the actions is best? He replied: Observing prayer early in its period.\n\nAl-Khuza'i narrated in his version from his aunt named Umm Farwah who took the oath of allegiance to the Prophet (ﷺ): He was questioned.",
			ref:   "Reference: Sunan Abi Dawud 426",
		}
	}
}

func (svc *Service) buildReminderText(info ReminderInfo, withQuote bool) (string, string) {
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
		quote := reminderQuoteByLang(info.Language, withQuote)
		body := fmt.Sprintf(
			"%d minutes have passed since %s prayer.\n\n%s\n%s",
			offset,
			prayer,
			quote.quote,
			quote.ref,
		)
		return "Prayer reminder", body
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
