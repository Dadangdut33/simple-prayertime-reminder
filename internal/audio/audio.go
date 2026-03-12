package audio

import (
	"bytes"
	_ "embed"
	"fmt"
	"io"
	"sync"

	"github.com/ebitengine/oto/v3"
	"github.com/hajimehoshi/go-mp3"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/logging"
)

//go:embed adhan.mp3
var adhanNormalData []byte

//go:embed adhan_fajr.mp3
var adhanFajrData []byte

// Service manages adhan audio playback
type Service struct {
	ctx     *oto.Context
	player  *oto.Player
	mu      sync.Mutex
	ready   chan struct{}
	initErr error
}

var log = logging.With("audio")

// NewService creates a new Audio service and initializes the audio context
func NewService() *Service {
	svc := &Service{ready: make(chan struct{})}
	go svc.init()
	return svc
}

func (svc *Service) init() {
	ctx, readyChan, err := oto.NewContext(&oto.NewContextOptions{
		SampleRate:   44100,
		ChannelCount: 2,
		Format:       oto.FormatSignedInt16LE,
	})
	if err != nil {
		svc.initErr = err
		log.Error("audio context init failed", "error", err)
		close(svc.ready)
		return
	}
	<-readyChan
	svc.ctx = ctx
	close(svc.ready)
}

// waitReady waits until the audio context is ready
func (svc *Service) waitReady() bool {
	<-svc.ready
	return svc.ctx != nil
}

// Play plays the adhan audio. Pass isFajr=true to play the Fajr adhan.
// volume is in range 0.0 to 1.0.
func (svc *Service) Play(isFajr bool, volume float64) error {
	if !svc.waitReady() {
		if svc.initErr != nil {
			return fmt.Errorf("audio context failed: %w", svc.initErr)
		}
		return fmt.Errorf("audio context not ready")
	}

	svc.mu.Lock()
	defer svc.mu.Unlock()

	// Stop any existing playback
	svc.stopLocked()

	data := adhanNormalData
	if isFajr {
		data = adhanFajrData
	}

	decoder, err := mp3.NewDecoder(bytes.NewReader(data))
	if err != nil {
		return err
	}

	player := svc.ctx.NewPlayer(decoder)
	player.SetVolume(clamp(volume, 0, 1))
	player.Play()
	svc.player = player
	log.Info("adhan play", "fajr", isFajr, "volume", volume)
	return nil
}

// Stop stops any currently playing adhan
func (svc *Service) Stop() {
	svc.mu.Lock()
	defer svc.mu.Unlock()
	svc.stopLocked()
}

func (svc *Service) stopLocked() {
	if svc.player != nil {
		log.Info("adhan stop")
		svc.player.Pause()
		_, _ = svc.player.Seek(0, io.SeekStart)
		svc.player = nil
	}
}

// IsPlaying returns whether the adhan is currently playing
func (svc *Service) IsPlaying() bool {
	svc.mu.Lock()
	defer svc.mu.Unlock()
	return svc.player != nil && svc.player.IsPlaying()
}

func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}
