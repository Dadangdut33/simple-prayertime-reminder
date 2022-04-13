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
import { configInterface, initialConfig, writeConfig, readConfig, cacheDataInterface } from './handler/files';
import { getPrayerTimes } from './handler/praytime';
import { onUnresponsiveWindow, errorBox } from './handler/messageBox';
import { getLatLong, getLatLong_FromCitiesName } from './handler/getPos';

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
		appConfig.timezoneOption.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; // get timezone

		// get location
		// default location is 0, 0. So if both of these methods fail, it will still works.
		const dataPos = await getLatLong(appConfig);
		if (!dataPos.success) {
			// if fail, get from city name
			const dataPosTry_2 = getLatLong_FromCitiesName(Intl.DateTimeFormat().resolvedOptions().timeZone === 'utc' ? 'utc' : Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[1]);

			if (dataPosTry_2.success) {
				appConfig.locationOption.city = dataPosTry_2.result[0].name;
				appConfig.locationOption.latitude = dataPosTry_2.result[0].loc.coordinates[1];
				appConfig.locationOption.longitude = dataPosTry_2.result[0].loc.coordinates[0];
			}
		} else {
			// successfully get lat long from the api
			appConfig.locationOption.city = dataPos.data.city;
			appConfig.locationOption.latitude = dataPos.data.latitude;
			appConfig.locationOption.longitude = dataPos.data.longitude;
		}

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

ipcMain.on('get-config', (event, _arg) => {
	event.returnValue = appConfig;
});

ipcMain.on('get-cached', (event, _arg) => {
	event.returnValue = cacheData;
});

ipcMain.on('get-version', (event, _arg) => {
	event.returnValue = process.env.npm_package_version;
});

ipcMain.on('open-external-url', (_event, arg) => {
	shell.openExternal(arg);
});
