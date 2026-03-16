package logging

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

var (
	mu         sync.Mutex
	baseLog    *slog.Logger
	levelVar   slog.LevelVar
	fileWriter *rotatingFileWriter
	ready      bool
	opts       Options
	handlerRef = &handlerStore{}
)

// Logger returns the configured base logger.
func Logger() *slog.Logger {
	mu.Lock()
	defer mu.Unlock()
	if !ready {
		opts = normalizeOptions(opts)
		buildLoggerLocked()
		ready = true
	}
	return baseLog
}

// With returns a logger pre-tagged with a component name.
func With(component string) *slog.Logger {
	return Logger().With("component", component)
}

// Configure updates logging options. Safe to call multiple times.
func Configure(options Options) {
	mu.Lock()
	defer mu.Unlock()
	opts = normalizeOptions(options)
	if ready {
		buildLoggerLocked()
	}
}

// SetLevel updates the log level dynamically.
func SetLevel(level string) {
	mu.Lock()
	defer mu.Unlock()
	if !ready {
		opts.Level = level
		return
	}
	levelVar.Set(parseLevel(level))
}

// LogFilePath returns the current log file path if file logging is enabled.
func LogFilePath() string {
	mu.Lock()
	defer mu.Unlock()
	if !ready {
		opts = normalizeOptions(opts)
		buildLoggerLocked()
		ready = true
	}
	if fileWriter == nil {
		return ""
	}
	return fileWriter.Path()
}

// Close flushes and closes the log file if one is open.
func Close() {
	mu.Lock()
	defer mu.Unlock()
	if fileWriter != nil {
		_ = fileWriter.Close()
		fileWriter = nil
	}
}

func buildLoggerLocked() {
	levelVar.Set(parseLevel(opts.Level))

	if fileWriter != nil {
		_ = fileWriter.Close()
		fileWriter = nil
	}

	writer := buildWriterLocked()
	handler := slog.NewTextHandler(writer, &slog.HandlerOptions{
		Level: &levelVar,
	})
	handlerRef.Store(handler)
	if baseLog == nil {
		baseLog = slog.New(&dynamicHandler{store: handlerRef})
		slog.SetDefault(baseLog)
	}
}

func parseLevel(level string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func normalizeOptions(options Options) Options {
	if options.Level == "" {
		options.Level = "info"
	}
	if options.KeepDays <= 0 {
		options.KeepDays = 7
	}
	if options.BaseName == "" {
		options.BaseName = "app"
	}
	if options.Dir == "" {
		options.Dir = defaultLogDir()
	}
	return options
}

func buildWriterLocked() io.Writer {
	writers := []io.Writer{os.Stdout}

	if opts.Dir != "" {
		fileWriter = newRotatingFileWriter(opts.Dir, opts.BaseName, opts.KeepDays)
		if fileWriter != nil {
			writers = append(writers, fileWriter)
		}
	}

	if len(writers) == 1 {
		return writers[0]
	}
	return io.MultiWriter(writers...)
}

func defaultLogDir() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(homeDir, ".config", "simple-prayertime-reminder")
}

type rotatingFileWriter struct {
	mu          sync.Mutex
	dir         string
	baseName    string
	keepDays    int
	currentDate string
	currentPath string
	file        *os.File
}

func newRotatingFileWriter(dir, baseName string, keepDays int) *rotatingFileWriter {
	writer := &rotatingFileWriter{
		dir:      dir,
		baseName: baseName,
		keepDays: keepDays,
	}
	if err := writer.rotateLocked(time.Now()); err != nil {
		fmt.Fprintln(os.Stderr, "logging: failed to create log file:", err)
		return nil
	}
	return writer
}

func (w *rotatingFileWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if err := w.rotateLocked(time.Now()); err != nil {
		return len(p), nil
	}
	if w.file == nil {
		return len(p), nil
	}
	_, _ = w.file.Write(p)
	return len(p), nil
}

func (w *rotatingFileWriter) Path() string {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.currentPath
}

func (w *rotatingFileWriter) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.file == nil {
		return nil
	}
	_ = w.file.Sync()
	err := w.file.Close()
	w.file = nil
	return err
}

func (w *rotatingFileWriter) rotateLocked(now time.Time) error {
	date := now.Format("2006-01-02")
	if date == w.currentDate && w.file != nil {
		return nil
	}

	if w.file != nil {
		_ = w.file.Sync()
		_ = w.file.Close()
		w.file = nil
	}

	if err := os.MkdirAll(w.dir, 0o755); err != nil {
		return err
	}

	path := filepath.Join(w.dir, fmt.Sprintf("%s-%s.log", w.baseName, date))
	file, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}

	w.file = file
	w.currentDate = date
	w.currentPath = path
	w.pruneLocked(now)
	return nil
}

func (w *rotatingFileWriter) pruneLocked(now time.Time) {
	if w.keepDays <= 0 {
		return
	}

	cutoff := now.AddDate(0, 0, -(w.keepDays - 1))
	entries, err := os.ReadDir(w.dir)
	if err != nil {
		return
	}

	prefix := w.baseName + "-"
	suffix := ".log"
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasPrefix(name, prefix) || !strings.HasSuffix(name, suffix) {
			continue
		}

		dateStr := strings.TrimSuffix(strings.TrimPrefix(name, prefix), suffix)
		parsed, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			continue
		}
		if parsed.Before(cutoff) {
			_ = os.Remove(filepath.Join(w.dir, name))
		}
	}
}

type handlerStore struct {
	current atomic.Value
}

func (s *handlerStore) Store(handler slog.Handler) {
	s.current.Store(handler)
}

func (s *handlerStore) Load() slog.Handler {
	if value := s.current.Load(); value != nil {
		return value.(slog.Handler)
	}
	return slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
}

type dynamicHandler struct {
	store  *handlerStore
	attrs  []slog.Attr
	groups []string
}

func (h *dynamicHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return h.store.Load().Enabled(ctx, level)
}

func (h *dynamicHandler) Handle(ctx context.Context, record slog.Record) error {
	handler := h.store.Load()
	for _, group := range h.groups {
		handler = handler.WithGroup(group)
	}
	if len(h.attrs) > 0 {
		handler = handler.WithAttrs(h.attrs)
	}
	return handler.Handle(ctx, record)
}

func (h *dynamicHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	next := &dynamicHandler{
		store:  h.store,
		attrs:  append(append([]slog.Attr(nil), h.attrs...), attrs...),
		groups: append([]string(nil), h.groups...),
	}
	return next
}

func (h *dynamicHandler) WithGroup(name string) slog.Handler {
	next := &dynamicHandler{
		store:  h.store,
		attrs:  append([]slog.Attr(nil), h.attrs...),
		groups: append(append([]string(nil), h.groups...), name),
	}
	return next
}
