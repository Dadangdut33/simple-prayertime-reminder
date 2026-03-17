package audio

import (
	"bytes"
	_ "embed"
	"encoding/binary"
	"fmt"
	"io"

	"github.com/ebitengine/oto/v3"
	"github.com/youpy/go-wav"
)

const (
	pcm16Min = -32768
	pcm16Max = 32767
)

//go:embed adhan.wav
var adhanNormalData []byte

//go:embed adhan_fajr.wav
var adhanFajrData []byte

// NewService creates a new Audio service and initializes the audio context
func NewService() *Service {
	svc := &Service{ready: make(chan struct{})}
	go svc.init()
	return svc
}

func (svc *Service) init() {
	_, sampleRate, channels, err := parseWav(adhanNormalData)
	if err != nil {
		svc.initErr = err
		log.Error("audio context init failed", "error", err)
		close(svc.ready)
		return
	}
	ctx, readyChan, err := oto.NewContext(&oto.NewContextOptions{
		SampleRate:   sampleRate,
		ChannelCount: channels,
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
	svc.sampleRate = sampleRate
	svc.channelCount = channels
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

	pcm, sampleRate, channels, err := parseWav(data)
	if err != nil {
		return err
	}
	if svc.sampleRate != 0 && sampleRate != svc.sampleRate {
		return fmt.Errorf("wav sample rate mismatch: expected %d, got %d", svc.sampleRate, sampleRate)
	}
	if svc.channelCount != 0 && channels != svc.channelCount {
		return fmt.Errorf("wav channel count mismatch: expected %d, got %d", svc.channelCount, channels)
	}

	player := svc.ctx.NewPlayer(bytes.NewReader(pcm))
	player.SetVolume(clamp(volume, 0, 1))
	player.Play()
	svc.player = player
	log.Info("adhan play", "fajr", isFajr, "volume", volume)
	return nil
}

func parseWav(data []byte) (pcm []byte, sampleRate int, channels int, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("wav: decode panic: %v", r)
		}
	}()
	reader := wav.NewReader(bytes.NewReader(data))
	format, err := reader.Format()
	if err != nil {
		return nil, 0, 0, err
	}
	if format == nil {
		return nil, 0, 0, fmt.Errorf("wav: missing format")
	}
	if format.BitsPerSample != 16 {
		return nil, 0, 0, fmt.Errorf("wav: unsupported bits per sample %d", format.BitsPerSample)
	}
	channels = int(format.NumChannels)
	sampleRate = int(format.SampleRate)
	if channels != 1 && channels != 2 {
		return nil, 0, 0, fmt.Errorf("wav: unsupported channels %d", channels)
	}

	var buf bytes.Buffer
	for {
		samples, err := reader.ReadSamples()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, 0, 0, err
		}
		for _, sample := range samples {
			for ch := 0; ch < channels; ch++ {
				v := reader.IntValue(sample, uint(ch))
				if v > pcm16Max {
					v = pcm16Max
				} else if v < pcm16Min {
					v = pcm16Min
				}
				_ = binary.Write(&buf, binary.LittleEndian, int16(v))
			}
		}
	}

	return buf.Bytes(), sampleRate, channels, nil
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
