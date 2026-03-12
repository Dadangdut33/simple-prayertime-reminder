package tray

import (
	"fmt"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/appservice"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/logging"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"

	"github.com/wailsapp/wails/v3/pkg/application"
)

const trayRefreshInterval = 15 * time.Minute

const (
	trayLeftClickToggleWindow = "toggle-window"
	trayLeftClickOpenMenu     = "open-menu"
	trayLeftClickNone         = "none"
)

var log = logging.With("tray")

type MenuState struct {
	identityItem *application.MenuItem
	titleItem    *application.MenuItem
	dateItem     *application.MenuItem
	prayerNames  []string
	prayerItems  []*application.MenuItem

	leftClickMu     sync.RWMutex
	leftClickAction string
	skipNextClick   atomic.Bool
	forceMenuOnce   atomic.Bool
}

func Setup(app *application.App, appSvc *appservice.Service, mainWindow application.Window, appName string, appIcon []byte) *MenuState {
	tray := app.SystemTray.New()
	trayLabel := buildTrayIdentityLabel(appSvc, appName)

	if runtime.GOOS == "darwin" {
		tray.SetLabel(" " + trayLabel)
	} else {
		tray.SetLabel(appName)
	}

	tray.SetTooltip(trayLabel)
	tray.SetIcon(appIcon)
	state, menu := buildTrayMenu(app, appSvc, mainWindow, trayLabel, appIcon, appName)
	tray.SetMenu(menu)
	state.forceMenuOnce.Store(true)
	tray.OnRightClick(func() {
		state.skipNextClick.Store(true)
		tray.OpenMenu()
	})
	tray.OnClick(func() {
		if state.skipNextClick.Swap(false) {
			return
		}
		if state.forceMenuOnce.Swap(false) {
			state.tryOpenMenu(tray)
			return
		}
		if state.leftClickMode() == trayLeftClickNone {
			return
		}

		if state.leftClickMode() == trayLeftClickOpenMenu {
			state.tryOpenMenu(tray)
			return
		}

		if mainWindow.IsVisible() {
			mainWindow.Hide()
			return
		}

		mainWindow.Show()
		mainWindow.Focus()
	})

	state.UpdateLeftClickAction(getTrayLeftClickAction(appSvc))
	return state
}

func buildTrayMenu(
	app *application.App,
	appSvc *appservice.Service,
	mainWindow application.Window,
	trayLabel string,
	appIcon []byte,
	appName string,
) (*MenuState, *application.Menu) {
	menu := app.Menu.New()
	state := &MenuState{
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
		state.refresh(appSvc, appName)
	})
	menu.AddSeparator()
	menu.Add("Quit").OnClick(func(_ *application.Context) {
		app.Quit()
	})

	state.refresh(appSvc, appName)
	startTrayRefreshLoop(app, appSvc, state, appName)

	return state, menu
}

func startTrayRefreshLoop(app *application.App, appSvc *appservice.Service, state *MenuState, appName string) {
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
				state.refresh(appSvc, appName)
			}
		}
	}()
}

func (s *MenuState) refresh(appSvc *appservice.Service, appName string) {
	s.identityItem.SetLabel(buildTrayIdentityLabel(appSvc, appName))
	s.UpdateLeftClickAction(getTrayLeftClickAction(appSvc))

	schedule, err := appSvc.GetTodaySchedule()
	if err != nil {
		log.Warn("tray schedule load failed", "error", err)
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

func buildTrayIdentityLabel(appSvc *appservice.Service, appName string) string {
	info, err := appSvc.GetAppInfo()
	if err != nil || info.Version == "" {
		return appName
	}

	return fmt.Sprintf("%s %s", appName, info.Version)
}

func getTrayLeftClickAction(appSvc *appservice.Service) string {
	cfg, err := appSvc.GetSettings()
	if err != nil {
		log.Warn("tray settings load failed", "error", err)
		return trayLeftClickToggleWindow
	}

	return normalizeTrayLeftClick(cfg.TrayLeftClick)
}

func normalizeTrayLeftClick(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "open-menu":
		return trayLeftClickOpenMenu
	case trayLeftClickNone:
		return trayLeftClickNone
	default:
		return trayLeftClickToggleWindow
	}
}

func (s *MenuState) UpdateLeftClickAction(value string) {
	action := normalizeTrayLeftClick(value)
	s.leftClickMu.Lock()
	s.leftClickAction = action
	s.leftClickMu.Unlock()
}

func (s *MenuState) leftClickMode() string {
	s.leftClickMu.RLock()
	defer s.leftClickMu.RUnlock()
	if s.leftClickAction == "" {
		return trayLeftClickToggleWindow
	}
	return s.leftClickAction
}

func (s *MenuState) tryOpenMenu(tray *application.SystemTray) {
	if runtime.GOOS == "linux" {
		return
	}
	tray.OpenMenu()
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
