import adhan, { Coordinates, CalculationMethod } from 'adhan';
import Moment from 'moment-timezone';
import { configInterface } from 'main/interfaces';

const methodMap = {
	MuslimWorldLeague: CalculationMethod.MuslimWorldLeague,
	Egyptian: CalculationMethod.Egyptian,
	Karachi: CalculationMethod.Karachi,
	UmmAlQura: CalculationMethod.UmmAlQura,
	Dubai: CalculationMethod.Dubai,
	MoonsightingCommittee: CalculationMethod.MoonsightingCommittee,
	NorthAmerica: CalculationMethod.NorthAmerica,
	Kuwait: CalculationMethod.Kuwait,
	Qatar: CalculationMethod.Qatar,
	Singapore: CalculationMethod.Singapore,
	Tehran: CalculationMethod.Tehran,
	Turkey: CalculationMethod.Turkey,
};

const highLatitudeRuleMap = {
	MiddleOfTheNight: adhan.HighLatitudeRule.MiddleOfTheNight,
	SeventhOfTheNight: adhan.HighLatitudeRule.SeventhOfTheNight,
	TwilightAngle: adhan.HighLatitudeRule.TwilightAngle,
};

export const getPrayerTimes = (settings: configInterface) => {
	const date = new Date(), // Current date
		params = methodMap[settings.calcOption.method](),
		coordinates = new Coordinates(parseFloat(settings.locationOption.latitude), parseFloat(settings.locationOption.longitude));

	// Set madhab
	params.madhab = settings.calcOption.madhab === 'Shafi' ? adhan.Madhab.Shafi : adhan.Madhab.Hanafi;

	// Set highLatitudeRule
	params.highLatitudeRule = highLatitudeRuleMap[settings.calcOption.highLatitudeRule];

	// adjustments
	params.adjustments = {
		fajr: settings.calcOption.adjustments.fajr,
		sunrise: settings.calcOption.adjustments.sunrise,
		dhuhr: settings.calcOption.adjustments.dhuhr,
		asr: settings.calcOption.adjustments.asr,
		maghrib: settings.calcOption.adjustments.maghrib,
		isha: settings.calcOption.adjustments.isha,
	};

	// ----------------------------------------------------------------
	// HH:mm -> 24h | h:mm A -> AM/PM
	const prayerGet = new adhan.PrayerTimes(coordinates, date, params);
	let fajrTime = Moment(prayerGet.fajr).tz(settings.timezoneOption.timezone),
		sunriseTime = Moment(prayerGet.sunrise).tz(settings.timezoneOption.timezone),
		dhuhrTime = Moment(prayerGet.dhuhr).tz(settings.timezoneOption.timezone),
		asrTime = Moment(prayerGet.asr).tz(settings.timezoneOption.timezone),
		maghribTime = Moment(prayerGet.maghrib).tz(settings.timezoneOption.timezone),
		ishaTime = Moment(prayerGet.isha).tz(settings.timezoneOption.timezone),
		current = prayerGet.currentPrayer().toString(),
		next = prayerGet.nextPrayer().toString();

	if (next === 'none') next = 'fajr';

	return {
		prayerGet,
		fajrTime,
		sunriseTime,
		dhuhrTime,
		asrTime,
		maghribTime,
		ishaTime,
		current,
		next,
	};
};
