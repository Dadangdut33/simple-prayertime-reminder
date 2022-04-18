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
	theInterval = null,
	ptGet: getPrayerTimes_I,
	iconPath = '';

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

	const RESOURCES_PATH = app.isPackaged ? path.join(process.resourcesPath, 'assets') : path.join(__dirname, '../../assets');

	const getAssetPath = (...paths: string[]): string => {
		return path.join(RESOURCES_PATH, ...paths);
	};

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

		const RESOURCES_PATH = app.isPackaged ? path.join(process.resourcesPath, 'assets') : path.join(__dirname, '../../assets');
		const getAssetPath = (...paths: string[]): string => {
			return path.join(RESOURCES_PATH, ...paths);
		};

		iconPath = getAssetPath('icon.png');

		// start notification interval
		notifyInterval();

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

const getMinuteFromSeconds = (seconds: number) => {
	return Math.floor(seconds / 60);
};

const getMinuteToSeconds = (minute: number) => {
	return minute * 60;
};

const updatePt = () => {
	ptGet = getPrayerTimes(appConfig);
};

const getPt = (pt: string) => {
	const pt_Map: any = {
		fajr: ptGet.fajrTime,
		sunrise: ptGet.sunriseTime,
		dhuhr: ptGet.dhuhrTime,
		asr: ptGet.asrTime,
		maghrib: ptGet.maghribTime,
		isha: ptGet.ishaTime,
	};

	return pt_Map[pt];
};

const checkNotify = (now: Date) => {
	const nowMoment = Moment(now).tz(appConfig.timezoneOption.timezone).toString();
	let notification = null,
		title,
		subtitle = 'Prayer time',
		body,
		icon = path.join(__dirname, 'assets/icons/icon.png');
	if (nowMoment === ptGet.fajrTime) {
		title = 'Fajr';
		body = 'Fajr time is now';
	} else if (nowMoment === ptGet.sunriseTime) {
		title = 'Sunrise';
		body = 'Sunrise time is now';
	} else if (nowMoment === ptGet.dhuhrTime) {
		title = 'Dhuhr';
		body = 'Dhuhr time is now';
	} else if (nowMoment === ptGet.asrTime) {
		title = 'Asr';
		body = 'Asr time is now';
	} else if (nowMoment === ptGet.maghribTime) {
		title = 'Maghrib';
		body = 'Maghrib time is now';
	} else if (nowMoment === ptGet.ishaTime) {
		title = 'Isha';
		body = 'Isha time is now';
	}

	if (title) {
		notification = new Notification({ title, subtitle, body, icon });
		notification.show();
	}
};

const notifyInterval = () => {
	theInterval = setInterval(() => {
		const now = new Date();

		checkNotify(now);

		// check if it's time to notify
		// if (Moment(now).tz(appConfig.timezoneOption.timezone) ===
	}, 1000);
};
