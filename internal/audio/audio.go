package audio

import (
	"bytes"
	_ "embed"
	"encoding/binary"
	"fmt"
	"io"
	"math"
	"os"
	"path/filepath"
	"strings"

	"github.com/ebitengine/oto/v3"
	"github.com/hajimehoshi/go-mp3"
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
func (svc *Service) Play(isFajr bool, volume float64, customPath string, customFajrPath string) error {
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

	data, sourcePath, usedCustom := resolvePlaybackSource(isFajr, customPath, customFajrPath)

	pcm, sampleRate, channels, err := decodeAudioData(data, sourcePath)
	if err != nil && usedCustom {
		log.Warn("custom adhan decode failed, using embedded fallback", "path", sourcePath, "error", err)
		data, sourcePath, _ = resolvePlaybackSource(isFajr, "", "")
		pcm, sampleRate, channels, err = decodeAudioData(data, sourcePath)
	}
	if err != nil {
		return err
	}
	if svc.sampleRate > 0 && svc.channelCount > 0 &&
		(sampleRate != svc.sampleRate || channels != svc.channelCount) {
		pcm, err = convertPCM16LE(pcm, sampleRate, channels, svc.sampleRate, svc.channelCount)
		if err != nil {
			return fmt.Errorf(
				"audio format conversion failed (src=%dHz/%dch, dst=%dHz/%dch): %w",
				sampleRate, channels, svc.sampleRate, svc.channelCount, err,
			)
		}
	}

	player := svc.ctx.NewPlayer(bytes.NewReader(pcm))
	player.SetVolume(clamp(volume, 0, 1))
	player.Play()
	svc.player = player
	log.Info("adhan play", "fajr", isFajr, "volume", volume, "source", sourcePath)
	return nil
}

func resolvePlaybackSource(isFajr bool, customPath string, customFajrPath string) (data []byte, sourcePath string, usedCustom bool) {
	data = adhanNormalData
	sourcePath = "embedded:adhan.wav"
	selectedPath := strings.TrimSpace(customPath)
	if isFajr {
		data = adhanFajrData
		sourcePath = "embedded:adhan_fajr.wav"
		selectedPath = strings.TrimSpace(customFajrPath)
	}
	if selectedPath == "" {
		return data, sourcePath, false
	}
	customData, readErr := os.ReadFile(selectedPath)
	if readErr != nil {
		log.Warn("custom adhan read failed, using embedded fallback", "path", selectedPath, "error", readErr)
		return data, sourcePath, false
	}
	return customData, selectedPath, true
}

func decodeAudioData(data []byte, sourcePath string) (pcm []byte, sampleRate int, channels int, err error) {
	ext := strings.ToLower(filepath.Ext(sourcePath))
	switch ext {
	case ".mp3":
		return parseMP3(data)
	case ".wav", "":
		return parseWav(data)
	default:
		pcm, sampleRate, channels, err = parseWav(data)
		if err == nil {
			return pcm, sampleRate, channels, nil
		}
		return parseMP3(data)
	}
}

func parseMP3(data []byte) (pcm []byte, sampleRate int, channels int, err error) {
	decoder, err := mp3.NewDecoder(bytes.NewReader(data))
	if err != nil {
		return nil, 0, 0, fmt.Errorf("mp3: decode init failed: %w", err)
	}
	pcm, err = io.ReadAll(decoder)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("mp3: decode failed: %w", err)
	}
	sampleRate = decoder.SampleRate()
	channels = 2 // go-mp3 decoder output is stereo 16-bit little-endian PCM.
	return pcm, sampleRate, channels, nil
}

func convertPCM16LE(pcm []byte, srcRate int, srcChannels int, dstRate int, dstChannels int) ([]byte, error) {
	if srcRate <= 0 || dstRate <= 0 {
		return nil, fmt.Errorf("invalid sample rate")
	}
	if srcChannels != 1 && srcChannels != 2 {
		return nil, fmt.Errorf("unsupported source channels: %d", srcChannels)
	}
	if dstChannels != 1 && dstChannels != 2 {
		return nil, fmt.Errorf("unsupported destination channels: %d", dstChannels)
	}
	if len(pcm)%2 != 0 {
		return nil, fmt.Errorf("invalid pcm byte length")
	}

	samples := make([]int16, len(pcm)/2)
	for i := range samples {
		samples[i] = int16(binary.LittleEndian.Uint16(pcm[i*2 : i*2+2]))
	}
	frames := len(samples) / srcChannels
	if frames == 0 {
		return nil, fmt.Errorf("empty pcm")
	}

	outFrames := int(math.Round(float64(frames) * float64(dstRate) / float64(srcRate)))
	if outFrames < 1 {
		outFrames = 1
	}

	outSamples := make([]int16, outFrames*dstChannels)
	for i := 0; i < outFrames; i++ {
		var srcPos float64
		if outFrames == 1 || frames == 1 {
			srcPos = 0
		} else {
			srcPos = float64(i) * float64(frames-1) / float64(outFrames-1)
		}
		base := int(srcPos)
		next := base + 1
		if next >= frames {
			next = base
		}
		frac := srcPos - float64(base)

		var left, right float64
		if srcChannels == 1 {
			v0 := float64(samples[base])
			v1 := float64(samples[next])
			left = v0 + (v1-v0)*frac
			right = left
		} else {
			l0 := float64(samples[base*2])
			l1 := float64(samples[next*2])
			r0 := float64(samples[base*2+1])
			r1 := float64(samples[next*2+1])
			left = l0 + (l1-l0)*frac
			right = r0 + (r1-r0)*frac
		}

		if dstChannels == 1 {
			mono := (left + right) / 2
			if mono > pcm16Max {
				mono = pcm16Max
			} else if mono < pcm16Min {
				mono = pcm16Min
			}
			outSamples[i] = int16(mono)
		} else {
			if left > pcm16Max {
				left = pcm16Max
			} else if left < pcm16Min {
				left = pcm16Min
			}
			if right > pcm16Max {
				right = pcm16Max
			} else if right < pcm16Min {
				right = pcm16Min
			}
			outSamples[i*2] = int16(left)
			outSamples[i*2+1] = int16(right)
		}
	}

	out := make([]byte, len(outSamples)*2)
	for i, v := range outSamples {
		binary.LittleEndian.PutUint16(out[i*2:i*2+2], uint16(v))
	}
	return out, nil
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
