package main

import (
	"embed"
	"log"
	"os"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/appservice"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/audio"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/autostart"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/location"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/notification"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/scheduler"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/settings"

	"github.com/wailsapp/wails/v3/pkg/application"
)

const (
	appName        = "Simple PrayerTime Reminder"
	appDescription = "A simple, Muslim companion app."
)

func shouldStartHidden(args []string) bool {
	for _, arg := range args {
		if arg == autostart.BackgroundArg {
			return true
		}
	}

	return false
}

//go:embed assets/icon.png
var appIcon []byte

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	startHidden := shouldStartHidden(os.Args[1:])

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
		Name:        appName,
		Description: appDescription,
		Icon:        appIcon,
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
		Title:            appName,
		Width:            1024,
		Height:           700,
		MinWidth:         800,
		MinHeight:        580,
		Hidden:           startHidden,
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
