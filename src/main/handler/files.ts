import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { Moment } from 'moment-timezone';
import path from 'path';
const appConfigPath = path.join(__dirname, '../../../config/config.json');
const cacheDataPath = path.join(__dirname, '../../../config/cachedata.json');
const pathDict = {
	app: appConfigPath,
	cache: cacheDataPath,
};

// -------------------------------------------------------------------------------------
export interface cacheDataInterface {
	fajr: string | Moment;
	sunrise: string | Moment;
	dhuhr: string | Moment;
	asr: string | Moment;
	maghrib: string | Moment;
	isha: string | Moment;
}

interface reminderInterface {
	remindWhenOnTime: boolean;
	earlyReminder: boolean;
	earlyTime: number;
}

export interface calcOptionInterface {
	mode: 'auto' | 'manual';
	method: 'MuslimWorldLeague' | 'Egyptian' | 'Karachi' | 'UmmAlQura' | 'Dubai' | 'MoonsightingCommittee' | 'NorthAmerica' | 'Kuwait' | 'Qatar' | 'Singapore' | 'Tehran' | 'Turkey';
	madhab: 'Shafi' | 'Hanafi';
	highLatitudeRule: 'MiddleOfTheNight' | 'SeventhOfTheNight' | 'TwilightAngle';
	adjustments: {
		fajr: number;
		sunrise: number;
		dhuhr: number;
		asr: number;
		maghrib: number;
		isha: number;
	};
}

export interface configInterface {
	locationOption: {
		mode: 'auto' | 'manual';
		city: string;
		latitude: string;
		longitude: string;
	};
	timezoneOption: {
		mode: 'auto' | 'manual';
		timezone: string;
	};
	calcOption: calcOptionInterface;
	reminderOption: {
		fajr: reminderInterface;
		sunrise: reminderInterface;
		dhuhr: reminderInterface;
		asr: reminderInterface;
		maghrib: reminderInterface;
		isha: reminderInterface;
	};
	geoLocAPIKey: {
		mode: 'auto' | 'manual';
		key: string;
	};
	updateEvery_X_Hours: number;
	runAtStartup: boolean;
	checkUpdateAtStartup: boolean;
	theme: 'dark' | 'light';
}

export const initialConfig: configInterface = {
	locationOption: {
		mode: 'auto',
		city: '',
		latitude: '0',
		longitude: '0',
	},
	timezoneOption: {
		mode: 'auto',
		timezone: '',
	},
	calcOption: {
		mode: 'auto',
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
	updateEvery_X_Hours: 4,
	runAtStartup: true,
	checkUpdateAtStartup: true,
	theme: 'light',
};

export const cacheData: cacheDataInterface = {
	fajr: '',
	sunrise: '',
	dhuhr: '',
	asr: '',
	maghrib: '',
	isha: '',
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

export const writeConfig = (cfg_type: 'app' | 'cache', content: any) => {
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

export const readConfig = (cfg_type: 'app' | 'cache') => {
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
