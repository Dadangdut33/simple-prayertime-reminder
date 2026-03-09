package main

import (
	"fmt"
	"runtime"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/appservice"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"

	"github.com/wailsapp/wails/v3/pkg/application"
)

const trayRefreshInterval = 15 * time.Minute

type trayMenuState struct {
	identityItem *application.MenuItem
	titleItem    *application.MenuItem
	dateItem     *application.MenuItem
	prayerNames  []string
	prayerItems  []*application.MenuItem
}

func setupTray(app *application.App, appSvc *appservice.Service, mainWindow application.Window) {
	tray := app.SystemTray.New()
	trayLabel := buildTrayIdentityLabel(appSvc)

	if runtime.GOOS == "darwin" {
		tray.SetLabel(" " + trayLabel)
	} else {
		tray.SetLabel(appName)
	}

	tray.SetTooltip(trayLabel)
	tray.SetIcon(appIcon)
	tray.SetMenu(buildTrayMenu(app, appSvc, mainWindow, trayLabel))
	tray.OnClick(func() {
		if mainWindow.IsVisible() {
			mainWindow.Hide()
		} else {
			mainWindow.Show()
			mainWindow.Focus()
		}
	})
	tray.OnRightClick(func() {
		tray.OpenMenu()
	})
}

func buildTrayMenu(
	app *application.App,
	appSvc *appservice.Service,
	mainWindow application.Window,
	trayLabel string,
) *application.Menu {
	menu := app.Menu.New()
	state := &trayMenuState{
		identityItem: menu.Add(trayLabel).SetEnabled(false).SetBitmap(appIcon),
		titleItem:    menu.Add("Today's Prayer Times").SetEnabled(false),
		dateItem:     menu.Add("Loading today's schedule...").SetEnabled(false),
		prayerNames:  []string{"Fajr", "Sunrise", "Zuhr", "Asr", "Maghrib", "Isha"},
	}

	for _, prayerName := range state.prayerNames {
		state.prayerItems = append(state.prayerItems, menu.Add(prayerName+": --").SetEnabled(false))
	}

	menu.AddSeparator()
	menu.Add("Show App").OnClick(func(_ *application.Context) {
		mainWindow.Show()
		mainWindow.Focus()
	})
	menu.Add("Refresh Prayer Times").OnClick(func(_ *application.Context) {
		state.refresh(appSvc)
	})
	menu.AddSeparator()
	menu.Add("Quit").OnClick(func(_ *application.Context) {
		app.Quit()
	})

	state.refresh(appSvc)
	startTrayRefreshLoop(app, appSvc, state)

	return menu
}

func startTrayRefreshLoop(app *application.App, appSvc *appservice.Service, state *trayMenuState) {
	ticker := time.NewTicker(trayRefreshInterval)
	done := make(chan struct{})

	app.OnShutdown(func() {
		close(done)
	})

	go func() {
		defer ticker.Stop()

		for {
			select {
			case <-done:
				return
			case <-ticker.C:
				state.refresh(appSvc)
			}
		}
	}()
}

func (s *trayMenuState) refresh(appSvc *appservice.Service) {
	s.identityItem.SetLabel(buildTrayIdentityLabel(appSvc))

	schedule, err := appSvc.GetTodaySchedule()
	if err != nil {
		s.titleItem.SetHidden(false)
		s.titleItem.SetLabel("Today's Prayer Times")
		s.dateItem.SetLabel("Unable to load today's prayer times")
		for idx, item := range s.prayerItems {
			if idx >= len(s.prayerNames) {
				break
			}
			item.SetLabel(s.prayerNames[idx] + ": --")
		}
		return
	}

	s.titleItem.SetHidden(true)
	s.dateItem.SetLabel("- " + formatTrayScheduleDate(schedule) + " -")

	times := []struct {
		name string
		time time.Time
	}{
		{name: "Fajr", time: schedule.Fajr},
		{name: "Sunrise", time: schedule.Sunrise},
		{name: "Zuhr", time: schedule.Zuhr},
		{name: "Asr", time: schedule.Asr},
		{name: "Maghrib", time: schedule.Maghrib},
		{name: "Isha", time: schedule.Isha},
	}

	for idx, entry := range times {
		if idx >= len(s.prayerItems) {
			break
		}
		s.prayerItems[idx].SetLabel(fmt.Sprintf("%s: %s", entry.name, formatTrayPrayerTime(entry.time)))
	}
}

func buildTrayIdentityLabel(appSvc *appservice.Service) string {
	info, err := appSvc.GetAppInfo()
	if err != nil || info.Version == "" {
		return appName
	}

	return fmt.Sprintf("%s %s", appName, info.Version)
}

func formatTrayScheduleDate(schedule prayer.DaySchedule) string {
	if parsed, err := time.Parse("2006-01-02", schedule.Date); err == nil {
		return parsed.Format("Mon, 02 Jan 2006")
	}

	for _, prayerTime := range []time.Time{
		schedule.Fajr,
		schedule.Sunrise,
		schedule.Zuhr,
		schedule.Asr,
		schedule.Maghrib,
		schedule.Isha,
	} {
		if !prayerTime.IsZero() {
			return prayerTime.Format("Mon, 02 Jan 2006")
		}
	}

	return schedule.Date
}

func formatTrayPrayerTime(value time.Time) string {
	if value.IsZero() {
		return "--"
	}

	return value.Format("03:04 PM")
}
