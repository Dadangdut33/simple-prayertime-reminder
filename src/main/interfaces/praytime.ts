import adhan from 'adhan';
export interface getPrayerTimes_I {
	prayerGet: adhan.PrayerTimes;
	fajrTime: string;
	sunriseTime: string;
	dhuhrTime: string;
	asrTime: string;
	maghribTime: string;
	ishaTime: string;
	current: string;
	next: string;
}
