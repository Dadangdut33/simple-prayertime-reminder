package main

import (
	"embed"
	"log"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/appservice"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/audio"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/location"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/notification"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/scheduler"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/settings"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Initialize core services
	configPath, _ := appservice.ConfigDirectory()
	settingsSvc2, _ := settings.NewService(configPath)

	// Load settings
	cfg := settingsSvc2.Get()
	locSvc2 := location.NewService(location.Location{
		City:      cfg.Location.City,
		Country:   cfg.Location.Country,
		Latitude:  cfg.Location.Latitude,
		Longitude: cfg.Location.Longitude,
		Elevation: cfg.Location.Elevation,
		Timezone:  cfg.Location.Timezone,
	})

	audioSvc2 := audio.NewService()

	// Dependency injection for dependent services
	prayerSvc2 := prayer.NewService()
	prayerSvc2.SetConfig(appservice.BuildPrayerConfig(cfg))

	// The primary AppService which binds methods to JS
	appSvc := appservice.New(prayerSvc2, locSvc2, settingsSvc2, audioSvc2)

	app := application.New(application.Options{
		Name:        "Simple PrayerTime Reminder",
		Description: "A simple, Muslim companion app.",
		Services: []application.Service{
			application.NewService(appSvc),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: false,
		},
	})

	// Notification and Scheduler need app to emit events/manage windows
	notifSvc2 := notification.NewService(app)
	schedulerSvc2 := scheduler.NewService(prayerSvc2, audioSvc2, notifSvc2)

	appSvc.SetRuntimeServices(notifSvc2, schedulerSvc2)

	// Main window
	mainWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:            "Simple PrayerTime Reminder",
		Width:            1024,
		Height:           700,
		MinWidth:         800,
		MinHeight:        580,
		URL:              "/",
		BackgroundColour: application.NewRGB(15, 15, 25),
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
	})
	_ = mainWindow

	// System tray
	setupTray(app, appSvc, mainWindow)

	// Start scheduler
	schedulerSvc2.Start(cfg)

	// If AutoDetectLocation is true and location is empty, trigger detection async
	if cfg.Location.AutoDetect && cfg.Location.City == "" {
		go func() {
			_, _ = appSvc.DetectLocation()
		}()
	}

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}

func setupTray(app *application.App, appSvc *appservice.Service, mainWindow application.Window) {
	tray := app.SystemTray.New()
	tray.SetLabel("Simple PrayerTime Reminder")

	menu := app.Menu.New()
	menu.Add("Show App").OnClick(func(_ *application.Context) {
		mainWindow.Show()
		mainWindow.Focus()
	})
	menu.AddSeparator()

	menu.Add("Quit").OnClick(func(_ *application.Context) {
		app.Quit()
	})

	tray.SetMenu(menu)
	tray.OnClick(func() {
		if mainWindow.IsVisible() {
			mainWindow.Hide()
		} else {
			mainWindow.Show()
			mainWindow.Focus()
		}
	})
}
