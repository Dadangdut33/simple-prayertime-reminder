<p align="center">
  <img src="https://github.com/Dadangdut33/simple-prayertime-reminder/blob/main/assets/display_icon.png?raw=true" width="250" alt="Simple Prayertime Reminder Logo">
</p>

<h1 align="center">Simple PrayerTime Reminder</h1>

<p align="center">
  A desktop Muslim companion app for prayer times, reminders, Qibla, and more.
</p>

<p align="center">
  <a href="https://github.com/Dadangdut33/simple-prayertime-reminder/issues"><img alt="GitHub issues" src="https://img.shields.io/github/issues/Dadangdut33/simple-prayertime-reminder"></a>
  <a href="https://github.com/Dadangdut33/simple-prayertime-reminder/pulls"><img alt="GitHub pull requests" src="https://img.shields.io/github/issues-pr/Dadangdut33/simple-prayertime-reminder"></a>
  <a href="https://github.com/Dadangdut33/simple-prayertime-reminder/releases/latest"><img alt="GitHub release" src="https://img.shields.io/github/v/release/Dadangdut33/simple-prayertime-reminder"></a>
  <a href="https://github.com/Dadangdut33/simple-prayertime-reminder/releases/latest"><img alt="GitHub downloads" src="https://img.shields.io/github/downloads/Dadangdut33/simple-prayertime-reminder/total?label=downloads%20(github)"></a>
  <a href="https://sourceforge.net/projects/simple-prayertime-reminder/files/latest/download"><img alt="SourceForge downloads" src="https://img.shields.io/sourceforge/dt/simple-prayertime-reminder.svg?label=downloads%20(sourceforge)"></a>
  <a href="https://github.com/Dadangdut33/simple-prayertime-reminder/stargazers"><img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/Dadangdut33/simple-prayertime-reminder?style=social"></a>
  <a href="https://github.com/Dadangdut33/simple-prayertime-reminder/network/members"><img alt="GitHub forks" src="https://img.shields.io/github/forks/Dadangdut33/simple-prayertime-reminder?style=social"></a>
</p>

This project was previously Electron-based. It now uses a Go backend with a React frontend powered by Wails v3.

## Features

- Daily prayer schedule and next-prayer countdown
- Configurable prayer calculation method, offsets, and reminder timing
- Adhan playback with adjustable volume
- Auto-detected or manual location setup
- Qibla direction
- Monthly prayer timetable export to CSV and Excel
- System tray integration and reminder window
- Embedded Quran page (quran.com) with simple note system

## Showcase

<details open>
  <summary>Preview</summary>
  <p align="center">
    <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/1.png" width="700" alt="Preview 1">
    <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/1p.png" width="700" alt="Preview 1 modal">
    <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/1_1.png" width="700" alt="Preview 1 dark">
    <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/1_1p.png" width="700" alt="Preview 1 dark modal">
    <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/2.png" width="700" alt="Preview 2">
    <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/3.png" width="700" alt="Preview 3">
    <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/4.png" width="700" alt="Preview 4">
    <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/5.png" alt="Preview 5">
    <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/6.png" alt="Preview 6">
  </p>
</details>

## Download

- [Latest release](https://github.com/Dadangdut33/simple-prayertime-reminder/releases/latest)
- [SourceForge mirror](https://sourceforge.net/projects/simple-prayertime-reminder/)

## Installation

1. Download the latest release from [GitHub](https://github.com/Dadangdut33/simple-prayertime-reminder/releases/latest).
2. Extract or install the package for your platform.
3. Run the application.

## Uninstallation

- Installer build: run the uninstaller.
- Portable build: remove the extracted folder.
- Windows only: if you enabled auto-start in an older version, you may still have a registry entry under `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`.

## Development Setup

### Requirements

- Go `1.25+`
- `pnpm`
- `wails3` CLI
- Platform dependencies required by Wails/WebView for your OS

This repo includes a `Taskfile.yml`, and the Wails CLI can run those tasks directly, so you do not need a separate `task` binary if you use `wails3 task ...`.

### First-time setup

1. Install Go dependencies:

```bash
go mod download
```

2. Install frontend dependencies:

```bash
cd frontend
pnpm install
cd ..
```

3. Install the Wails v3 CLI if you do not already have it:

```bash
go install github.com/wailsapp/wails/v3/cmd/wails3@latest
```

### Run in development mode

```bash
wails3 task dev
```

This starts the Go backend, the Vite dev server for `frontend/`, and the desktop app together.

### Build the app

Build for the current platform:

```bash
wails3 task build
```

Create a packaged build for the current platform:

```bash
wails3 task package
```

Generated binaries are written to `bin/`.

## Useful Commands

Run the desktop app in development mode:

```bash
wails3 task dev
```

Build the frontend only:

```bash
cd frontend
pnpm run build
```

Type-check the frontend:

```bash
cd frontend
pnpm run typecheck
```

Build the server-mode binary:

```bash
wails3 task build:server
```

Build the Docker image for cross-compilation:

```bash
wails3 task setup:docker
```

## Project Layout

```text
.
├── main.go          # Wails app entrypoint and service bindings
├── internal/        # Go application logic
├── frontend/        # React + Vite frontend
├── build/           # Wails build assets and platform packaging config
├── assets/          # Icons and bundled audio assets
└── Taskfile.yml     # Build and packaging tasks
```

## Configuration

Application settings are stored in:

```text
~/.config/simple-prayertime-reminder/settings.json
```

The file is created automatically on first run.

## Help

- [Wiki](https://github.com/Dadangdut33/simple-prayertime-reminder/wiki)
- [Issues](https://github.com/Dadangdut33/simple-prayertime-reminder/issues)
- [Discussions](https://github.com/Dadangdut33/simple-prayertime-reminder/discussions)

## Attribution

- <a href="https://youtu.be/iaWZ_3D6vOQ">Adhan uploaded by Ayat via YouTube</a>
- <a href="https://www.flaticon.com/free-icons/mosque" title="mosque icons">Mosque icons created by Freepik - Flaticon</a>

## License

MIT © [Dadangdut33](https://github.com/Dadangdut33/simple-prayertime-reminder/blob/main/LICENSE)
