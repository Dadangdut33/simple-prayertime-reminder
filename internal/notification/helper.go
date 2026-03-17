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
	translations := loadReminderQuotes()
	locale, ok := translations[lang]
	if !ok {
		locale = translations["en"]
	}
	return reminderQuote{
		quote: locale.AfterQuoteBefore + "\n\n" + locale.AfterQuoteEmphasis + "\n\n" + locale.AfterQuoteAfter,
		ref:   locale.AfterReference,
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
