import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';
const appConfigPath = path.join(__dirname, '../../../json/config.json');
const cacheDataPath = path.join(__dirname, '../../../json/cachedata.json');
const pathDict = {
	app: appConfigPath,
	cache: cacheDataPath,
};

// -------------------------------------------------------------------------------------
interface reminderInterface {
	enabled: boolean;
	time: number;
}

export interface calcOptionInterface {
	method: 'MuslimWorldLeague' | 'Egyptian' | 'Karachi' | 'UmmAlQura' | 'Dubai' | 'MoonsightingCommittee' | 'NorthAmerica' | 'Kuwait' | 'Qatar' | 'Singapore' | 'Tehran' | 'Turkey';
	mode: 'auto' | 'manual';
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
	geoLocAPIKey: string;
}

export interface cacheDataInterface {
	fajr: string;
	sunrise: string;
	dhuhr: string;
	asr: string;
	maghrib: string;
	isha: string;
}

export const initialConfig: configInterface = {
	locationOption: {
		latitude: '',
		longitude: '',
	},
	timezoneOption: {
		mode: 'auto',
		timezone: '',
	},
	calcOption: {
		method: 'MuslimWorldLeague',
		mode: 'auto',
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
			enabled: false,
			time: 0,
		},
		sunrise: {
			enabled: false,
			time: 0,
		},
		dhuhr: {
			enabled: false,
			time: 0,
		},
		asr: {
			enabled: false,
			time: 0,
		},
		maghrib: {
			enabled: false,
			time: 0,
		},
		isha: {
			enabled: false,
			time: 0,
		},
	},
	geoLocAPIKey: '', // get from https://freegeoip.app/
};

export const cacheData = {
	fajr: '',
	sunrise: '',
	dhuhr: '',
	asr: '',
	maghrib: '',
	isha: '',
};

// -------------------------------------------------------
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
