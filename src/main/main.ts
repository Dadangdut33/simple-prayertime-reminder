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
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { configInterface, cacheDataInterface } from './interfaces';
import { initialConfig, writeConfig, readConfig } from './handler/files';
import { getPrayerTimes } from './handler/praytime';
import { onUnresponsiveWindow, errorBox, NoYesBox } from './handler/messageBox';
import { getLatLong_FromCitiesName, getPosition_absolute } from './handler/getPos';
import Moment from 'moment-timezone';

// Global vars
let mainWindow: BrowserWindow | null = null,
	appConfig: configInterface,
	cacheData: cacheDataInterface;

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
	// update prayertimes cache
	const pt_Get = getPrayerTimes(appConfig);

	cacheData = {
		fajr: pt_Get.fajrTime,
		sunrise: pt_Get.sunriseTime,
		dhuhr: pt_Get.dhuhrTime,
		asr: pt_Get.asrTime,
		maghrib: pt_Get.maghribTime,
		isha: pt_Get.ishaTime,
	};

	writeConfig('cache', cacheData);
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
ipcMain.on('ipc-example', async (event, arg) => {
	console.log(arg);
	const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
	// console.log(msgTemplate(arg));
	event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.on('test-sync', (event, arg) => {
	console.log(arg);
	event.returnValue = 'pong';
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
	}

	event.returnValue = success;
});

ipcMain.on('get-cached', (event, _arg) => {
	event.returnValue = cacheData;
});

ipcMain.on('get-version', (event, _arg) => {
	event.returnValue = process.env.npm_package_version;
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

// ----------------------------------------------------
// misc
ipcMain.on('open-external-url', (_event, arg) => {
	shell.openExternal(arg);
});

ipcMain.on('yesno-dialog', (event, arg: any) => {
	const result = NoYesBox(arg.title, arg.question, mainWindow as BrowserWindow);
	event.returnValue = result;
});
