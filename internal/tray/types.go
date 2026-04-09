package tray

import (
	"sync"
	"sync/atomic"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/appservice"
	"github.com/wailsapp/wails/v3/pkg/application"
)

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

	appSvc  *appservice.Service
	appName string
}
