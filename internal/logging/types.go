package logging

// Options configures the logging output.
type Options struct {
	Dir      string
	Level    string
	KeepDays int
	BaseName string
}
