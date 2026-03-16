package audio

import (
	"sync"

	"github.com/ebitengine/oto/v3"
)

// Service manages adhan audio playback
type Service struct {
	ctx     *oto.Context
	player  *oto.Player
	mu      sync.Mutex
	ready   chan struct{}
	initErr error
}
