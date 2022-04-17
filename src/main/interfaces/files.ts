export interface reminderInterface {
	remindWhenOnTime: boolean;
	earlyReminder: boolean;
	earlyTime: number;
}

export interface calcOptionInterface {
	mode: 'default' | 'manual';
	method: string | 'MuslimWorldLeague' | 'Egyptian' | 'Karachi' | 'UmmAlQura' | 'Dubai' | 'MoonsightingCommittee' | 'NorthAmerica' | 'Kuwait' | 'Qatar' | 'Singapore' | 'Tehran' | 'Turkey';
	madhab: string | 'Shafi' | 'Hanafi';
	highLatitudeRule: string | 'MiddleOfTheNight' | 'SeventhOfTheNight' | 'TwilightAngle';
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
	clockStyle: string | 'AM/PM' | '24h';
	hijriCalendarOffset: number;
	theme: 'dark' | 'light';
}
