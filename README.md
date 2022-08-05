<p align="center">
    <img src="https://github.com/Dadangdut33/simple-prayertime-reminder/blob/main/assets/display_icon.png?raw=true" width="250px" alt="Simple Prayertime Reminder Logo">
</p>

<h1 align="center"> Simple Prayertime Reminder - A simple muslim prayertime reminder app for desktop </h1>
<p align="center">
    <a href="https://lgtm.com/projects/g/Dadangdut33/simple-prayertime-reminder/alerts/"><img alt="Total alerts" src="https://img.shields.io/lgtm/alerts/g/Dadangdut33/simple-prayertime-reminder.svg?logo=lgtm&logoWidth=18"/></a>
    <a href="https://lgtm.com/projects/g/Dadangdut33/simple-prayertime-reminder/context:javascript"><img alt="Language grade: JavaScript" src="https://img.shields.io/lgtm/grade/javascript/g/Dadangdut33/simple-prayertime-reminder.svg?logo=lgtm&logoWidth=18"/></a>
    <a href="https://github.com/Dadangdut33/simple-prayertime-reminder/issues"><img alt="GitHub issues" src="https://img.shields.io/github/issues/Dadangdut33/simple-prayertime-reminder"></a>
    <a href="https://github.com/Dadangdut33/simple-prayertime-reminder/pulls"><img alt="GitHub pull requests" src="https://img.shields.io/github/issues-pr/Dadangdut33/simple-prayertime-reminder"></a>
    <a href="https://github.com/Dadangdut33/simple-prayertime-reminder/releases/latest"><img alt="github downloads"  src="https://img.shields.io/github/downloads/Dadangdut33/simple-prayertime-reminder/total?label=downloads (github)"></a>
    <a href="https://sourceforge.net/projects/simple-prayertime-reminder/files/latest/download"><img alt="sourceforge downloads" src="https://img.shields.io/sourceforge/dt/simple-prayertime-reminder.svg?label=downloads (sourceforge)"></a>
    <a href="https://github.com/Dadangdut33/simple-prayertime-reminder/releases/latest"><img alt="GitHub release (latest SemVer)" src="https://img.shields.io/github/v/release/Dadangdut33/simple-prayertime-reminder"></a>
    <a href="https://github.com/Dadangdut33/simple-prayertime-reminder/commits/main"><img alt="GitHub commits since latest release (by date)" src="https://img.shields.io/github/commits-since/Dadangdut33/simple-prayertime-reminder/latest"></a><Br>
    <a href="https://github.com/Dadangdut33/simple-prayertime-reminder/stargazers"><img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/Dadangdut33/simple-prayertime-reminder?style=social"></a>
    <a href="https://github.com/Dadangdut33/simple-prayertime-reminder/network/members"><img alt="GitHub forks" src="https://img.shields.io/github/forks/Dadangdut33/simple-prayertime-reminder?style=social"></a>
</p>

A simple muslim prayertime reminder app for desktop. Made using [Electron](https://electron.atom.io/) with [electron-react-boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate). UI are made using [Material UI](https://mui.com/).

---

# Table of Contents

- [Table of Contents](#table-of-contents)
- [FAQ](#faq)
- [Features](#features)
- [Showcase](#showcase)
- [Download](#download)
- [Installation](#installation)
- [Uninstallation](#uninstallation)
- [Customization](#customization)
- [Developing](#developing)
  - [Starting Development](#starting-development)
  - [Packaging for Production](#packaging-for-production)
  - [Further Instructions](#further-instructions)
  - [Electron React Boilerplate Docs](#electron-react-boilerplate-docs)
  - [License](#license)
- [Attribution](#attribution)
- [Further help](#further-help)

---

# FAQ

1. **Q:** Compatible platform?\
   **A:** This app can be used on Windows and Linux. It should also work on MacOS but unfortunately, I haven't tested it.
2. **Q:** What is this app for?\
   **A:** This app works just like any other prayer time/reminder app, it shows prayer time schedule for a specific location/date and the reminder for it.
3. **Q:** How do i get help for the user settings?\
   **A:** You can check out the [wiki](https://github.com/Dadangdut33/simple-prayertime-reminder/wiki) on [this section](https://github.com/Dadangdut33/simple-prayertime-reminder/wiki/Options).
4. **Q:** My location is incorrect help\
   **A:** You can set the location manually in the settings. For more info check on the [options](https://github.com/Dadangdut33/simple-prayertime-reminder/wiki/Options) section of the wiki.
5. **Q:** Does this work offline?\
   **A:** Yes, the app works offline, internet connection is only needed for location detecting (there is also an offline method if an internet connection is not present) and version checking.

# Features

- prayer times with customizable reminder/notification
- Prayer times schedule (calendar)
- Export prayer times schedule
- Adhan
- Qibla direction

# Showcase

This app is quite modern looking because of Material UI, it also have dark and light theme.

<details open>
  <summary>Preview</summary>
  <p align="center">
      <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/1.png" width="700" alt="Preview 1">
      <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/1p.png" width="700" alt="Preview 1 modal">
      <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/1_1.png" width="700" alt="Preview 1_dark">
      <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/1_1p.png" width="700" alt="Preview 1_dark modal">
      <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/2.png" width="700" alt="Preview 2">
      <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/3.png" width="700" alt="Preview 3">
      <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/4.png" width="700" alt="Preview 4">
      <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/5.png" alt="Preview 5">
      <img src="https://raw.githubusercontent.com/Dadangdut33/simple-prayertime-reminder/master/preview/6.png" alt="Preview 6">
  </p>
</details>

# Download

- [Latest release](https://github.com/Dadangdut33/simple-prayertime-reminder/releases/latest)
- [Sourceforge](https://sourceforge.net/projects/simple-prayertime-reminder/)

# Installation

1. Download the latest release from [GitHub](https://github.com/Dadangdut33/simple-prayertime-reminder/releases/latest)
2. Extract/Install
3. Run the program

# Uninstallation

Run the uninstaller if you are using the installer version. If using the portable version, you can just delete the folder. **On windows**, there might be a registry left behind that you can delete if want to by going to regedit and delete the `Simple PrayerTime Reminder` registry on `\HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`.

# Customization

Check the [wiki](https://github.com/Dadangdut33/simple-prayertime-reminder/wiki) for more information.

# Developing

<img src=".erb/img/erb-banner.svg" width="100%" />
<p>
  This app is developed using Electron React Boilerplate. It uses <a href="https://electron.atom.io/">Electron</a>, <a href="https://facebook.github.io/react/">React</a>, <a href="https://github.com/reactjs/react-router">React Router</a>, <a href="https://webpack.js.org/">Webpack</a> and <a href="https://www.npmjs.com/package/react-refresh">React Fast Refresh</a>.
</p>

<br>

## Starting Development

Install all the packages:

```
npm install
```

Start the app in the `dev` environment:

```bash
npm start
```

## Packaging for Production

To package apps for the local platform:

```bash
npm run package
```

This will compile the app into the `release` folder.

**To compile the app into a certain architecture/platform**, you can add extra options to the `package` command, ex:

```bash
npm run package --win --ia32

# If npm does not work, try to use yarn
yarn package --win --ia32
```

For commands list you can check in the [official electron builder website](https://www.electron.build/cli)

## Further Instructions

You can check this repo's [wiki](https://github.com/Dadangdut33/simple-prayertime-reminder/wiki) or You can ask in [discussions](https://github.com/Dadangdut33/simple-prayertime-reminder/discussions)

## Electron React Boilerplate Docs

See Electron React Boilerplate [docs and guides here](https://electron-react-boilerplate.js.org/docs/installation)

## License

MIT © [Dadangdut33](https://github.com/Dadangdut33/simple-prayertime-reminder/blob/main/LICENSE) and
MIT © [Electron React Boilerplate](https://github.com/electron-react-boilerplate)

# Attribution

<a href="https://youtu.be/iaWZ_3D6vOQ">Adhan uploaded by Ayat Via Youtube</a>

<a href="https://www.flaticon.com/free-icons/mosque" title="mosque icons">Mosque icons created by Freepik - Flaticon</a>

# Further help

- Check the [Wiki](https://github.com/Dadangdut33/simple-prayertime-reminder/wiki/)
- Submit an [Issue](https://github.com/Dadangdut33/simple-prayertime-reminder/issues)
- Ask in [Discussion](https://github.com/Dadangdut33/simple-prayertime-reminder/discussions)
