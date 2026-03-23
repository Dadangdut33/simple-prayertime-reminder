package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

func main() {
	file, err := os.Open("build/config.yml")
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer file.Close()

	inInfo := false
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "info:") && !strings.HasPrefix(trimmed, "info: ") {
			inInfo = true
			continue
		}
		if inInfo {
			if len(line) > 0 && line[0] != ' ' && line[0] != '\t' {
				inInfo = false
			}
		}
		if !inInfo {
			continue
		}
		if strings.HasPrefix(trimmed, "version:") {
			value := strings.TrimSpace(strings.TrimPrefix(trimmed, "version:"))
			value = strings.SplitN(value, "#", 2)[0]
			value = strings.TrimSpace(value)
			value = strings.Trim(value, "\"'")
			if value != "" {
				fmt.Print(value)
				return
			}
		}
	}
	if err := scanner.Err(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	os.Exit(1)
}
