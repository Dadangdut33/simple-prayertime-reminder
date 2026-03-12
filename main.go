package main

import (
	"embed"
	"os"
	"path/filepath"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/appservice"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/audio"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/autostart"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/geonames"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/location"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/logging"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/notification"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/scheduler"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/settings"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/tray"

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
	logger := logging.With("main")
	startHidden := shouldStartHidden(os.Args[1:])
	logger.Info("app starting", "startHidden", startHidden)

	// Initialize core services
	configPath, err := appservice.ConfigDirectory()
	if err != nil {
		logger.Error("config directory error", "error", err)
	}
	logger.Info("config directory", "path", configPath)
	logging.Configure(logging.Options{Dir: configPath})
	settingsSvc2, err := settings.NewService(configPath)
	if err != nil {
		logger.Error("settings init failed", "error", err)
	}
	logging.Configure(logging.Options{Dir: configPath, Level: settingsSvc2.Get().LogLevel})
	if logPath := logging.LogFilePath(); logPath != "" {
		logger.Info("logging to file", "path", logPath)
	}
	geonamesDir := filepath.Join(configPath, "geonames")
	geonames.SetOverridePath(filepath.Join(geonamesDir, "cities500.txt"))
	geonames.SetMetadataPath(filepath.Join(geonamesDir, "metadata.json"))

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

	// Dependency injection for dependent services
	prayerSvc2 := prayer.NewService()
	prayerSvc2.SetConfig(appservice.BuildPrayerConfig(cfg))
	audioSvc := audio.NewService()

	// The primary AppService which binds methods to JS
	appSvc := appservice.New(prayerSvc2, locSvc2, settingsSvc2, audioSvc)

	logger.Info("creating application")
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

	app.OnShutdown(func() {
		logging.Close()
	})

	// Notification and Scheduler need app to emit events/manage windows
	notifSvc := notification.NewService(app, audioSvc)
	notifSvc.SetStatePaths(
		filepath.Join(configPath, "reminder_state.json"),
		filepath.Join(configPath, "reminder_test_state.json"),
	)
	schedulerSvc := scheduler.NewService(prayerSvc2, audioSvc, notifSvc)

	appSvc.SetRuntimeServices(notifSvc, schedulerSvc)

	// Main window
	logger.Info("creating main window")
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
	trayState := tray.Setup(app, appSvc, mainWindow, appName, appIcon)
	appservice.SetSettingsChangedHandler(appSvc, func(cfg settings.Settings) {
		if trayState != nil {
			trayState.UpdateLeftClickAction(cfg.TrayLeftClick)
		}
	})

	// Start scheduler
	logger.Info("starting scheduler")
	schedulerSvc.Start(cfg)

	// If AutoDetectLocation is true and location is empty, trigger detection async
	if cfg.Location.AutoDetect && cfg.Location.City == "" {
		logger.Info("auto-detect location queued")
		go func() {
			if _, err := appSvc.DetectLocation(); err != nil {
				logger.Warn("auto-detect location failed", "error", err)
			}
		}()
	}

	logger.Info("running application")
	err = app.Run()
	if err != nil {
		logger.Error("application exited with error", "error", err)
		os.Exit(1)
	}
}
