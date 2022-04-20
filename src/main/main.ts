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
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { configInterface, getPrayerTimes_I } from './interfaces';
import { initialConfig, writeConfig, readConfig } from './handler/files';
import { getPrayerTimes } from './handler/praytime';
import { onUnresponsiveWindow, errorBox, NoYesBox } from './handler/messageBox';
import { getLatLong_FromCitiesName, getPosition_absolute, verifyKey } from './handler/getPos';
import Moment from 'moment-timezone';

// Global vars
let mainWindow: BrowserWindow | null = null,
	appConfig: configInterface,
	ptGet: getPrayerTimes_I,
	iconPath = '',
	timerTimeout: NodeJS.Timeout,
	timerInterval: NodeJS.Timer,
	checkTimeChangesInterval: NodeJS.Timer;

// Functions
const RESOURCES_PATH = app.isPackaged ? path.join(process.resourcesPath, 'assets') : path.join(__dirname, '../../assets');
const getAssetPath = (...paths: string[]): string => {
	return path.join(RESOURCES_PATH, ...paths);
};

// -------------------------------------------------------------------------------------
/**
 * Setup
 */
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

const createWindow = async () => {
	if (isDevelopment) {
		await installExtensions();
	}

	mainWindow = new BrowserWindow({
		show: false,
		width: 1200,
		height: 728,
		minWidth: 800,
		minHeight: 600,
		icon: getAssetPath('icon.png'),
		webPreferences: {
			preload: app.isPackaged ? path.join(__dirname, 'preload.js') : path.join(__dirname, '../../.erb/dll/preload.js'),
		},
	});

	mainWindow.loadURL(resolveHtmlPath('index.html'));

	// unresponsive
	mainWindow.on('unresponsive', onUnresponsiveWindow);

	mainWindow.on('ready-to-show', () => {
		if (!mainWindow) {
			throw new Error('"mainWindow" is not defined');
		}
		if (process.env.START_MINIMIZED === 'true') {
			mainWindow.minimize();
		} else {
			mainWindow.show();
		}
	});

	mainWindow.on('closed', () => {
		mainWindow = null;
	});

	const menuBuilder = new MenuBuilder(mainWindow);
	menuBuilder.buildMenu();

	// Open urls in the user's browser
	mainWindow.webContents.setWindowOpenHandler((edata) => {
		shell.openExternal(edata.url);
		return { action: 'deny' };
	});
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

		// write config file
		if (data.toString().includes('ENOENT')) {
			// no config file found
			writeConfig('app', initialConfig);
		} else {
			writeConfig('app', initialConfig);
			errorBox('Failed to read config file', 'App has created a default value\nErr Details:\n' + data);
		}
	} else appConfig = data as configInterface;

	// ------------------------
	// update location on app start if enabled
	if (appConfig.locationOption.updateEveryStartup) {
		const { city, latitude, longitude } = await getPosition_absolute(appConfig);
		appConfig.locationOption.city = city;
		appConfig.locationOption.latitude = latitude;
		appConfig.locationOption.longitude = longitude;

		writeConfig('app', appConfig);
	}

	// get pt
	updatePt();
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

app.whenReady()
	.then(async () => {
		await checkConfigOnStart();
		createWindow();

		// get iconPath
		iconPath = getAssetPath('icon.png');

		// start notification interval
		notifyInterval();

		// check if locale time is changed by user
		if (appConfig.detectTimeChange) checkIfUserChangesLocalTime();

		app.on('activate', () => {
			// On macOS it's common to re-create a window in the app when the
			// dock icon is clicked and there are no other windows open.
			if (mainWindow === null) createWindow();
		});
	})
	.catch(console.log);

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

		appConfig = arg;
		updatePt();
	}

	event.returnValue = success;
});

ipcMain.on('get-timezone', (event, _arg) => {
	event.returnValue = appConfig.timezoneOption.timezone;
});

ipcMain.on('get-version', (event, _arg) => {
	event.returnValue = process.env.npm_package_version;
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

const checkNotifyOnTime = (now: Moment.Moment) => {
	let notification = null,
		title,
		subtitle = 'Prayer time',
		body;

	switch (now.format('HH:mm')) {
		case Moment(new Date(ptGet.fajrTime)).tz(appConfig.timezoneOption.timezone).format('HH:mm'):
			if (appConfig.reminderOption.fajr) title = 'Fajr';
			break;
		case Moment(new Date(ptGet.sunriseTime)).tz(appConfig.timezoneOption.timezone).format('HH:mm'):
			if (appConfig.reminderOption.sunrise) title = 'Sunrise';
			break;
		case Moment(new Date(ptGet.dhuhrTime)).tz(appConfig.timezoneOption.timezone).format('HH:mm'):
			if (appConfig.reminderOption.dhuhr) title = 'Dhuhr';
			break;
		case Moment(new Date(ptGet.asrTime)).tz(appConfig.timezoneOption.timezone).format('HH:mm'):
			if (appConfig.reminderOption.asr) title = 'Asr';
			break;
		case Moment(new Date(ptGet.maghribTime)).tz(appConfig.timezoneOption.timezone).format('HH:mm'):
			if (appConfig.reminderOption.maghrib) title = 'Maghrib';
			break;
		case Moment(new Date(ptGet.ishaTime)).tz(appConfig.timezoneOption.timezone).format('HH:mm'):
			if (appConfig.reminderOption.isha) title = 'Isha';
			break;
		default:
			break;
	}

	if (title) {
		body = `It's time for ${title === 'Sunrise' ? 'Sunrise' : title + ' Prayer'}`;

		notification = new Notification({ title, subtitle, body, icon: iconPath });
		notification.show();
		notification.addListener('click', () => {
			if (mainWindow) {
				mainWindow.show();
				mainWindow.focus();
			}
		});
	}
};

const checkNotifyBefore = (now: Moment.Moment) => {
	let notification = null,
		title,
		subtitle = 'Prayer time',
		body;

	// minutes before prayer
	switch (now.format('HH:mm')) {
		case Moment(new Date(ptGet.fajrTime)).tz(appConfig.timezoneOption.timezone).subtract(appConfig.reminderOption.fajr.earlyTime, 'minutes').format('HH:mm'):
			if (appConfig.reminderOption.fajr.earlyReminder) title = 'Fajr';
			body = `${appConfig.reminderOption.fajr.earlyTime} minutes before ${title} prayer`;
			break;
		case Moment(new Date(ptGet.sunriseTime)).tz(appConfig.timezoneOption.timezone).subtract(appConfig.reminderOption.sunrise.earlyTime, 'minutes').format('HH:mm'):
			if (appConfig.reminderOption.sunrise.earlyReminder) title = 'Sunrise';
			body = `${appConfig.reminderOption.sunrise.earlyTime} minutes before ${title}`;
			break;
		case Moment(new Date(ptGet.dhuhrTime)).tz(appConfig.timezoneOption.timezone).subtract(appConfig.reminderOption.dhuhr.earlyTime, 'minutes').format('HH:mm'):
			if (appConfig.reminderOption.dhuhr.earlyReminder) title = 'Dhuhr';
			body = `${appConfig.reminderOption.dhuhr.earlyTime} minutes before ${title} prayer`;
			break;
		case Moment(new Date(ptGet.asrTime)).tz(appConfig.timezoneOption.timezone).subtract(appConfig.reminderOption.asr.earlyTime, 'minutes').format('HH:mm'):
			if (appConfig.reminderOption.asr.earlyReminder) title = 'Asr';
			body = `${appConfig.reminderOption.asr.earlyTime} minutes before ${title} prayer`;
			break;
		case Moment(new Date(ptGet.maghribTime)).tz(appConfig.timezoneOption.timezone).subtract(appConfig.reminderOption.maghrib.earlyTime, 'minutes').format('HH:mm'):
			if (appConfig.reminderOption.maghrib.earlyReminder) title = 'Maghrib';
			body = `${appConfig.reminderOption.maghrib.earlyTime} minutes before ${title} prayer`;
			break;
		case Moment(new Date(ptGet.ishaTime)).tz(appConfig.timezoneOption.timezone).subtract(appConfig.reminderOption.isha.earlyTime, 'minutes').format('HH:mm'):
			if (appConfig.reminderOption.isha.earlyReminder) title = 'Isha';
			body = `${appConfig.reminderOption.isha.earlyTime} minutes before ${title} prayer`;
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
	}
};

const intervalFunc = () => {
	const now = new Date();
	const nowMoment = Moment(now).tz(appConfig.timezoneOption.timezone);

	checkNotifyBefore(nowMoment);
	checkNotifyOnTime(nowMoment);
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
	console.log('check if user changes local time');

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
	console.log('clear check if user changes local time');
	clearInterval(checkTimeChangesInterval);
};
