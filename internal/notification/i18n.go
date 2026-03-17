package notification

import (
	"encoding/json"
	"sync"

	_ "embed"
)

type reminderQuoteLocale struct {
	AfterQuoteBefore  string `json:"afterQuoteBefore"`
	AfterQuoteEmphasis string `json:"afterQuoteEmphasis"`
	AfterQuoteAfter   string `json:"afterQuoteAfter"`
	AfterReference    string `json:"afterReference"`
}

type reminderQuoteTranslations map[string]reminderQuoteLocale

//go:embed i18n/reminder_quotes.json
var reminderQuotesJSON []byte

var (
	reminderQuotesOnce sync.Once
	reminderQuotesData reminderQuoteTranslations
)

func loadReminderQuotes() reminderQuoteTranslations {
	reminderQuotesOnce.Do(func() {
		_ = json.Unmarshal(reminderQuotesJSON, &reminderQuotesData)
	})
	return reminderQuotesData
}
