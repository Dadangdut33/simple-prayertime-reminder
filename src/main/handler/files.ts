import path from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { configInterface } from 'main/interfaces';
const appConfigPath = path.join(__dirname, '../../../config/config.json');
const colorCachePath = path.join(__dirname, '../../../config/colorCache.json');
const pathDict = {
	app: appConfigPath,
	color: colorCachePath,
};
type validDict = 'app' | 'color';

// -------------------------------------------------------------------------------------
export const initialConfig: configInterface = {
	locationOption: {
		mode: 'auto',
		city: '',
		latitude: '0',
		longitude: '0',
		updateEveryStartup: false,
	},
	timezoneOption: {
		mode: 'auto',
		timezone: '',
	},
	calcOption: {
		mode: 'default',
		method: 'MuslimWorldLeague',
		madhab: 'Shafi',
		highLatitudeRule: 'TwilightAngle',
		adjustments: {
			fajr: 0,
			sunrise: 0,
			dhuhr: 0,
			asr: 0,
			maghrib: 0,
			isha: 0,
		},
	},
	reminderOption: {
		fajr: {
			remindWhenOnTime: true,
			earlyReminder: true,
			earlyTime: 15,
		},
		sunrise: {
			remindWhenOnTime: true,
			earlyReminder: true,
			earlyTime: 15,
		},
		dhuhr: {
			remindWhenOnTime: true,
			earlyReminder: true,
			earlyTime: 15,
		},
		asr: {
			remindWhenOnTime: true,
			earlyReminder: true,
			earlyTime: 15,
		},
		maghrib: {
			remindWhenOnTime: true,
			earlyReminder: true,
			earlyTime: 15,
		},
		isha: {
			remindWhenOnTime: true,
			earlyReminder: true,
			earlyTime: 15,
		},
	},
	geoLocAPIKey: {
		mode: 'auto',
		key: '', // get from https://freegeoip.app/
	},
	runAtStartup: true,
	clockStyle: 'AM/PM',
	checkUpdateAtStartup: true,
	detectTimeChange: false,
	hijriCalendarOffset: -1,
	theme: 'light',
};

// -------------------------------------------------------
// Error and success notif, will be handled in main
export const makeFolderIfNotExist = (path: string) => {
	try {
		if (!existsSync(path)) {
			mkdirSync(path);
		}
	} catch (err) {
		console.error(err);
	}
};

export const writeConfig = (cfg_type: validDict, content: any) => {
	let success = true;
	try {
		makeFolderIfNotExist(path.dirname(pathDict[cfg_type]));
		writeFileSync(pathDict[cfg_type], JSON.stringify(content, null, 2), 'utf-8');
	} catch (err) {
		console.error(err);
		success = false;
	} finally {
		return success;
	}
};

export const readConfig = (cfg_type: validDict) => {
	let success = true,
		data: any;
	try {
		data = readFileSync(pathDict[cfg_type], 'utf8');
		data = JSON.parse(data);
	} catch (error) {
		success = false;
		data = error;
	} finally {
		return {
			success,
			data,
		};
	}
};
