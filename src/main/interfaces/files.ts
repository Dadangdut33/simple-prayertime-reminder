import { Moment } from 'moment-timezone';

export interface cacheDataInterface {
	fajr: string | Moment;
	sunrise: string | Moment;
	dhuhr: string | Moment;
	asr: string | Moment;
	maghrib: string | Moment;
	isha: string | Moment;
}

export interface reminderInterface {
	remindWhenOnTime: boolean;
	earlyReminder: boolean;
	earlyTime: number;
}

export interface calcOptionInterface {
	mode: 'default' | 'manual';
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
		updateEveryStartup: boolean;
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
