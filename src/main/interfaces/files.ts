export type calcMethod = 'MuslimWorldLeague' | 'Egyptian' | 'Karachi' | 'UmmAlQura' | 'Dubai' | 'MoonsightingCommittee' | 'NorthAmerica' | 'Kuwait' | 'Qatar' | 'Singapore' | 'Tehran' | 'Turkey';
export type madhab = 'Shafi' | 'Hanafi';
export type highLatitudeRule_T = 'MiddleOfTheNight' | 'SeventhOfTheNight' | 'TwilightAngle';

export interface reminderInterface {
	remindWhenOnTime: boolean;
	earlyReminder: boolean;
	afterReminder: boolean;
	playAdhan: boolean;
	popup: boolean;
	earlyTime: number;
	afterTime: number;
}

export interface calcOptionInterface {
	mode: 'default' | 'manual';
	method: calcMethod;
	madhab: madhab;
	highLatitudeRule: highLatitudeRule_T;
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
	window: {
		width: number;
		height: number;
	};
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
	adhanSoundPath: {
		fajr: string;
		normal: string;
	};
	runAtStartup: boolean;
	checkUpdateAtStartup: boolean;
	clockStyle: string | 'AM/PM' | '24h';
	detectTimeChange: boolean;
	hijriCalendarOffset: number;
	theme: 'dark' | 'light';
}

export type ColorHex = `#${string}`;
export interface colorCache {
	current: string;
	colors: ColorHex[];
	intervals: number[];
}

export interface colorCacheGet {
	success: boolean;
	data: colorCache;
}
