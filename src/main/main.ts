/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, nativeTheme, Notification } from 'electron';
import Moment from 'moment-timezone';
import os from 'os';
import fetch from 'electron-fetch';
import { existsSync } from 'fs';

// -------------------------------------------------------------------------------------
import MenuBuilder from './menu';
import TrayManager from './tray';
import { resolveHtmlPath } from './util';
import { configInterface, getPrayerTimes_I } from './interfaces';
import { initialConfig, writeConfig, readConfig } from './handler/files';
import { getPrayerTimes } from './handler/praytime';
import { onUnresponsiveWindow, errorBox, NoYesBox } from './handler/messageBox';
import { getLatLong_FromCitiesName, getPosition_absolute, verifyKey } from './handler/getPos';

// -------------------------------------------------------------------------------------
// Global vars
let mainWindow: BrowserWindow | null = null,
	appConfig: configInterface,
	ptGet: getPrayerTimes_I,
	iconPath = '',
	timerTimeout: NodeJS.Timeout,
	timerInterval: NodeJS.Timer,
	checkTimeChangesInterval: NodeJS.Timer,
	startDate = new Date(),
	autoLaunch = require('auto-launch'),
	launcherOption = {
		name: 'Simple PrayerTimes Reminder',
		path: process.execPath,
		isHidden: true,
	},
	autoLauncher = new autoLaunch(launcherOption),
	modalTimeout: NodeJS.Timeout,
	adhanPath = '',
	adhanFajrPath = '',
	menuBuilder: MenuBuilder,
	trayManager: TrayManager,
	session_shown_splash = false,
	currentPage = '/';

// -------------------------------------------------------------------------------------
/**
 * Setup
 */
const RESOURCES_PATH = app.isPackaged ? path.join(process.resourcesPath, 'assets') : path.join(__dirname, '../../assets');
const getAssetPath = (...paths: string[]): string => {
	return path.join(RESOURCES_PATH, ...paths);
};

const wasOpenedAtLogin = () => {
	try {
		// mac
		if (os.platform() === 'darwin') {
			let loginSettings = app.getLoginItemSettings();
			return loginSettings.wasOpenedAtLogin;
		} // else
		return app.commandLine.hasSwitch('hidden');
	} catch {
		return false;
	}
};

if (process.env.NODE_ENV === 'production') {
	const sourceMapSupport = require('source-map-support');
	sourceMapSupport.install();
}

const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDevelopment) {
	require('electron-debug')();
}

const installExtensions = async () => {
	const installer = require('electron-devtools-installer');
	const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
	const extensions = ['REACT_DEVELOPER_TOOLS'];

	return installer
		.default(
			extensions.map((name) => installer[name]),
			forceDownload
		)
		.catch(console.log);
};

const checkConfigOnStart = async () => {
	const { success, data } = readConfig('app');
	// fail to read config
	if (!success) {
		// create new one
		appConfig = initialConfig;
		appConfig.timezoneOption.timezone = Moment.tz.guess(); // get timezone
		appConfig.theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'; // set initial theme

		// get location
		// default location is '0',' 0'. So if both of these methods fail, it will still works.
		const { city, latitude, longitude } = await getPosition_absolute(appConfig);
		appConfig.locationOption.city = city;
		appConfig.locationOption.latitude = latitude;
		appConfig.locationOption.longitude = longitude;

		// set autolaunch value
		autoLauncher
			.isEnabled()
			.then((isEnabled: boolean) => {
				if (isEnabled) return;

				autoLauncher.enable();
			})
			.catch((err: any) => {
				console.log(err);
			});

		// write config file
		if (data.toString().includes('ENOENT')) {
			// no config file found
			writeConfig('app', initialConfig);
		} else {
			writeConfig('app', initialConfig);
			errorBox('Failed to read config file', 'App has created a default value\nErr Details:\n' + data);
		}
	} else appConfig = data as configInterface;

	// get pt
	updatePt();
};

const updateLocationOnStart = async () => {
	// update location if auto and enabled
	if (appConfig.locationOption.mode === 'auto') {
		if (appConfig.locationOption.updateEveryStartup) {
			const { city, latitude, longitude } = await getPosition_absolute(appConfig);
			appConfig.locationOption.city = city;
			appConfig.locationOption.latitude = latitude;
			appConfig.locationOption.longitude = longitude;

			writeConfig('app', appConfig);
		}
	}
};

const updateTimezoneOnStart = () => {
	if (appConfig.timezoneOption.mode === 'auto') {
		appConfig.timezoneOption.timezone = Moment.tz.guess();
		writeConfig('app', appConfig);
	}
};

const createWindow = async () => {
	if (isDevelopment) {
		await installExtensions();
	}

	mainWindow = new BrowserWindow({
		show: false,
		width: 1200,
		height: 728,
		minWidth: 900,
		minHeight: 600,
		icon: getAssetPath('icon.png'),
		webPreferences: {
			preload: app.isPackaged ? path.join(__dirname, 'preload.js') : path.join(__dirname, '../../.erb/dll/preload.js'),
			webSecurity: false,
			allowRunningInsecureContent: true,
		},
	});

	mainWindow.loadURL(resolveHtmlPath('index.html'));

	// unresponsive
	mainWindow.on('unresponsive', onUnresponsiveWindow);

	menuBuilder = new MenuBuilder(mainWindow);
	menuBuilder.buildMenu();

	trayManager = new TrayManager(mainWindow!, getAssetPath('icon.png'));
	trayManager.createTray();
	trayManager.updatePrayTime(ptGet, appConfig); // update trayicon with the prayer times

	mainWindow.on('ready-to-show', () => {
		if (!mainWindow) {
			throw new Error('"mainWindow" is not defined');
		}

		// check update
		try {
			if (appConfig.checkUpdateAtStartup) {
				fetch('https://api.github.com/repos/Dadangdut33/simple-prayertime-reminder/releases/latest')
					.then((response) => response.json())
					.then((data) => {
						let latestVer = data.tag_name;
						if (latestVer > app.getVersion()) {
							const msg = 'New version available! Click to download';
							// notify with native notification
							const notify = new Notification({
								title: 'Simple PrayerTime Reminder',
								body: msg,
								icon: iconPath,
							});

							notify.show();

							notify.on('click', () => {
								shell.openExternal(data.html_url);
							});
						}
					});
			}
		} catch {}

		updateTimezoneOnStart();
		updateLocationOnStart();
	});

	mainWindow.on('close', (event: any) => {
		event.preventDefault();
		mainWindow!.hide();
	});

	// Open urls in the user's browser
	mainWindow.webContents.setWindowOpenHandler((edata) => {
		shell.openExternal(edata.url);
		return { action: 'deny' };
	});
};

// -------------------------------------------------------------------------------------
/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
	// Respect the OSX convention of having the application in memory even
	// after all windows have been closed
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

// -------------
// START
// -------------
// prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
	app.quit();
} else {
	app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
		// Someone tried to run a second instance, we should focus our window.
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();

			if (!mainWindow.isVisible()) mainWindow.show();

			mainWindow.focus();
		}
	});

	app.whenReady()
		.then(async () => {
			await checkConfigOnStart();
			await createWindow();

			// get paths
			iconPath = getAssetPath('icon.png');
			adhanPath = getAssetPath('adhan.mp3');
			adhanFajrPath = getAssetPath('adhan_fajr.mp3');

			// start notification interval
			notifyInterval();

			// start detecttimechange interval if enabled
			if (appConfig.detectTimeChange) checkIfUserChangesLocalTime(); // check if locale time is changed by user

			app.on('activate', () => {
				// On macOS it's common to re-create a window in the app when the
				// dock icon is clicked and there are no other windows open.
				if (mainWindow === null) createWindow();
			});

			// auto launch check
			const checkLoginOpen = wasOpenedAtLogin();

			if (checkLoginOpen) {
				mainWindow!.hide();
			} else {
				mainWindow!.show();
			}
		})
		.catch(console.log);
}

// -------------------------------------------------------------------------------------
/**
 * IPC
 */
// invoke from main process
ipcMain.on('invoke-open-changes-made', (_event, arg) => {
	if (mainWindow) mainWindow.webContents.send('open-changes-made', arg);
});

ipcMain.on('invoke-page-change', (_event, arg) => {
	if (mainWindow) mainWindow.webContents.send('page-change', arg);
});

ipcMain.on('update-tray', (_event, _arg) => {
	if (trayManager) trayManager.updatePrayTime(ptGet, appConfig);
});

// ----------------------------------------------------
// adhan
ipcMain.on('get-adhan-path', (event, _arg) => {
	event.returnValue = adhanPath.replace(/\\/g, '/');
});

ipcMain.on('get-adhan-path-fajr', (event, _arg) => {
	event.returnValue = adhanFajrPath.replace(/\\/g, '/');
});

// ----------------------------------------------------
// splash
ipcMain.on('get-splash-shown', (event, _arg) => {
	event.returnValue = session_shown_splash;
});

ipcMain.on('set-splash-shown', (_event, _arg) => {
	session_shown_splash = true;
});

ipcMain.on('get-current-page', (event, _arg) => {
	event.returnValue = currentPage;
});

ipcMain.on('set-current-page', (_event, arg) => {
	currentPage = arg;
});

// ----------------------------------------------------
// config/files
ipcMain.on('get-config', (event, _arg) => {
	event.returnValue = appConfig;
});

ipcMain.on('save-config', (event, arg) => {
	const success = writeConfig('app', arg);
	if (success) {
		// if detectclockChange is changed
		if (appConfig.detectTimeChange !== arg.detectTimeChange)
			if (arg.detectTimeChange) checkIfUserChangesLocalTime(); // check enabled or disabled
			else clearCheckTimeChangesInterval();

		// if runAtStartup is changed
		if (appConfig.runAtStartup !== arg.runAtStartup) {
			if (arg.runAtStartup) {
				autoLauncher.enable();
			} else {
				autoLauncher.disable();
			}
		}

		appConfig = arg;
		updatePt();
		trayManager.updatePrayTime(ptGet, appConfig);
	}

	event.returnValue = success;
});

ipcMain.on('get-timezone', (event, _arg) => {
	event.returnValue = appConfig.timezoneOption.timezone;
});

ipcMain.on('get-version', (event, _arg) => {
	event.returnValue = app.getVersion();
});

ipcMain.on('get-cache-color', (event, _arg) => {
	event.returnValue = readConfig('color');
});

ipcMain.on('save-cache-color', (_event, arg) => {
	writeConfig('color', arg);
});

// -----------
// location
ipcMain.on('get-location-auto', async (event, _arg) => {
	const { city, latitude, longitude } = await getPosition_absolute(appConfig);
	let successGet = true;
	if (city === '' && latitude === '0' && longitude === '0') successGet = false;

	event.returnValue = { city, latitude, longitude, successGet };
});

ipcMain.on('get-location-manual', (event, arg) => {
	const data = getLatLong_FromCitiesName(arg);
	event.returnValue = data;
});

// -----------
// tz
ipcMain.on('get-tz-auto', (event, _arg) => {
	event.returnValue = Moment.tz.guess();
});

ipcMain.on('get-tz-list', (event, _arg) => {
	event.returnValue = Moment.tz.names();
});

// -----------
// api key
/**
 * @deprecated The method should not be used
 */
ipcMain.on('verify-geoloc-key', async (event, arg) => {
	const { success, data } = await verifyKey(arg);
	event.returnValue = { success, data };
});

// ----------------------------------------------------
// misc
ipcMain.on('open-external-url', (_event, arg) => {
	shell.openExternal(arg);
});

ipcMain.on('yesno-dialog', (event, arg: any) => {
	const result = NoYesBox(arg.title, arg.question, mainWindow as BrowserWindow);
	event.returnValue = result;
});

// ----------------------------------------------------
// praytime
ipcMain.on('get-this-pt', (event, arg) => {
	const pt = getPrayerTimes(appConfig, arg);
	event.returnValue = pt;
});

// -------------------------------------------------------------------------------------
const updatePt = () => {
	ptGet = getPrayerTimes(appConfig);
};

// modal
const timeOutAutoCloseModal = () => {
	clearTimeout(modalTimeout);
	modalTimeout = setTimeout(() => {
		mainWindow!.webContents.send('close-modal');
	}, 600000); // 10 minutes
};

const checkNotifyOnTime = (now: Moment.Moment) => {
	let notification = null,
		title: string | null = null,
		subtitle = 'Prayer time',
		body,
		playAdhan = false;

	switch (now.format('HH:mm')) {
		case Moment(new Date(ptGet.fajrTime)).tz(appConfig.timezoneOption.timezone).format('HH:mm'):
			if (appConfig.reminderOption.fajr) {
				title = 'Fajr';
				if (appConfig.reminderOption.fajr.playAdhan) playAdhan = true;
			}
			break;
		case Moment(new Date(ptGet.sunriseTime)).tz(appConfig.timezoneOption.timezone).format('HH:mm'):
			if (appConfig.reminderOption.sunrise) {
				title = 'Sunrise';
			}
			break;
		case Moment(new Date(ptGet.dhuhrTime)).tz(appConfig.timezoneOption.timezone).format('HH:mm'):
			if (appConfig.reminderOption.dhuhr) {
				title = 'Dhuhr';
				if (appConfig.reminderOption.dhuhr.playAdhan) playAdhan = true;
			}
			break;
		case Moment(new Date(ptGet.asrTime)).tz(appConfig.timezoneOption.timezone).format('HH:mm'):
			if (appConfig.reminderOption.asr) {
				title = 'Asr';
				if (appConfig.reminderOption.asr.playAdhan) playAdhan = true;
			}
			break;
		case Moment(new Date(ptGet.maghribTime)).tz(appConfig.timezoneOption.timezone).format('HH:mm'):
			if (appConfig.reminderOption.maghrib) {
				title = 'Maghrib';
				if (appConfig.reminderOption.maghrib.playAdhan) playAdhan = true;
			}
			break;
		case Moment(new Date(ptGet.ishaTime)).tz(appConfig.timezoneOption.timezone).format('HH:mm'):
			if (appConfig.reminderOption.isha) {
				title = 'Isha';
				if (appConfig.reminderOption.isha.playAdhan) playAdhan = true;
			}
			break;
		default:
			break;
	}

	if (title) {
		body = `It's Time For ${title === 'Sunrise' ? 'Sunrise' : title + ' Prayer'}`;

		notification = new Notification({ title, subtitle, body, icon: iconPath });
		notification.show();
		notification.addListener('click', () => {
			if (mainWindow) {
				mainWindow.show();
				mainWindow.focus();
			}
		});

		// check adhan mp3 if play adhan
		if (playAdhan) {
			// check using fs wether adhanPath exist on disk or not
			const checkPath = title === 'Fajr' ? adhanFajrPath : adhanPath;
			if (!existsSync(checkPath)) {
				// notify missing adhan file
				const adhanNotFoundNotification = new Notification({
					title: `${title === 'Fajr' ? 'adhan' : 'adhan_fajr'}.mp3 file missing`,
					subtitle: '',
					body: `You can try to reinstall or copy your own ${title === 'Fajr' ? 'adhan' : 'adhan_fajr'}.mp3 to the assets folder of the app`,
					icon: iconPath,
				});
				adhanNotFoundNotification.show();
			}
		}

		if (mainWindow) {
			let data: any = {};
			if (title !== 'Sunrise') {
				// refresh from main because originally it will refresh the page to reset the timer ring
				mainWindow.webContents.send('refresh-from-main');
				data = {
					type: title === 'Fajr' ? 'adhan_fajr' : 'adhan',
					title: `Time For ${title} Prayer`,
					time: appConfig.clockStyle === '24h' ? now.format('HH:mm') : now.format('hh:mm A'),
					location: appConfig.locationOption.city,
					coordinates: `${appConfig.locationOption.latitude}, ${appConfig.locationOption.longitude}`,
				};
			} else if (title === 'Sunrise') {
				// timeout 2.5s before showing the modal
				data = {
					type: 'reminder',
					title: `Time For Sunrise`,
					time: appConfig.clockStyle === '24h' ? now.format('HH:mm') : now.format('hh:mm A'),
					location: appConfig.locationOption.city,
					coordinates: `${appConfig.locationOption.latitude}, ${appConfig.locationOption.longitude}`,
				};
			}

			setTimeout(() => {
				timeOutAutoCloseModal();
				if (data.type !== 'reminder') {
					mainWindow!.show();
				}
				mainWindow!.webContents.send('signal-modal-praytime', data);
			}, 2750);
		}
	}
};

const checkNotifyBefore = (now: Moment.Moment) => {
	let notification = null,
		title,
		subtitle = 'Prayer time',
		body = '';

	// minutes before prayer
	switch (now.format('HH:mm')) {
		case Moment(new Date(ptGet.fajrTime)).tz(appConfig.timezoneOption.timezone).subtract(appConfig.reminderOption.fajr.earlyTime, 'minutes').format('HH:mm'):
			if (appConfig.reminderOption.fajr.earlyReminder) title = 'Fajr';

			body = `${appConfig.reminderOption.fajr.earlyTime} Minutes Before ${title} Prayer`;
			break;
		case Moment(new Date(ptGet.sunriseTime)).tz(appConfig.timezoneOption.timezone).subtract(appConfig.reminderOption.sunrise.earlyTime, 'minutes').format('HH:mm'):
			if (appConfig.reminderOption.sunrise.earlyReminder) title = 'Sunrise';

			body = `${appConfig.reminderOption.sunrise.earlyTime} Minutes Before ${title}`;
			break;
		case Moment(new Date(ptGet.dhuhrTime)).tz(appConfig.timezoneOption.timezone).subtract(appConfig.reminderOption.dhuhr.earlyTime, 'minutes').format('HH:mm'):
			if (appConfig.reminderOption.dhuhr.earlyReminder) title = 'Dhuhr';

			body = `${appConfig.reminderOption.dhuhr.earlyTime} Minutes Before ${title} Prayer`;
			break;
		case Moment(new Date(ptGet.asrTime)).tz(appConfig.timezoneOption.timezone).subtract(appConfig.reminderOption.asr.earlyTime, 'minutes').format('HH:mm'):
			if (appConfig.reminderOption.asr.earlyReminder) title = 'Asr';

			body = `${appConfig.reminderOption.asr.earlyTime} Minutes Before ${title} Prayer`;
			break;
		case Moment(new Date(ptGet.maghribTime)).tz(appConfig.timezoneOption.timezone).subtract(appConfig.reminderOption.maghrib.earlyTime, 'minutes').format('HH:mm'):
			if (appConfig.reminderOption.maghrib.earlyReminder) title = 'Maghrib';

			body = `${appConfig.reminderOption.maghrib.earlyTime} Minutes Before ${title} Prayer`;
			break;
		case Moment(new Date(ptGet.ishaTime)).tz(appConfig.timezoneOption.timezone).subtract(appConfig.reminderOption.isha.earlyTime, 'minutes').format('HH:mm'):
			if (appConfig.reminderOption.isha.earlyReminder) title = 'Isha';

			body = `${appConfig.reminderOption.isha.earlyTime} Minutes Before ${title} Prayer`;
			break;
		default:
			break;
	}

	if (title) {
		notification = new Notification({ title, subtitle, body, icon: iconPath });
		notification.show();
		notification.addListener('click', () => {
			if (mainWindow) {
				mainWindow.show();
				mainWindow.focus();
			}
		});

		if (mainWindow) {
			mainWindow.webContents.send('signal-modal-praytime', {
				type: 'reminder',
				title: body,
				time: appConfig.clockStyle === '24h' ? now.format('HH:mm') : now.format('hh:mm A'),
				location: appConfig.locationOption.city,
				coordinates: `${appConfig.locationOption.latitude}, ${appConfig.locationOption.longitude}`,
			});
			timeOutAutoCloseModal();
		}
	}
};

const intervalFunc = () => {
	const now = new Date();
	const nowMoment = Moment(now).tz(appConfig.timezoneOption.timezone);

	checkNotifyBefore(nowMoment);
	checkNotifyOnTime(nowMoment);

	// check if 1 day has passed
	if (!nowMoment.isSame(Moment(startDate).tz(appConfig.timezoneOption.timezone), 'day')) {
		startDate = now;
		updatePt();
		// update the tray date
		ipcMain.emit('update-tray');
	}
};

const notifyInterval = () => {
	let toExactMinute = 60000 - (new Date().getTime() % 60000);
	// run on start
	intervalFunc();

	// timeout first before running to make sure it runs on exact minute
	timerTimeout = setTimeout(() => {
		timerInterval = setInterval(intervalFunc, 60000); // every 1 minute. Exact minute
		intervalFunc();
	}, toExactMinute);
};

const clearNotifyInterval = () => {
	clearInterval(timerInterval);
	clearTimeout(timerTimeout);
};

const checkIfUserChangesLocalTime = () => {
	let timeBefore = new Date();

	checkTimeChangesInterval = setInterval(() => {
		let checkDif = Math.floor((new Date().getTime() - timeBefore.getTime()) / 1000);
		if (checkDif !== 30) {
			// if user changes local time
			// reset the notification interval
			clearNotifyInterval();
			notifyInterval();

			timeBefore = new Date();
		} else {
			// no change
			timeBefore = new Date();
		}
	}, 30000);
};

const clearCheckTimeChangesInterval = () => {
	clearInterval(checkTimeChangesInterval);
};
