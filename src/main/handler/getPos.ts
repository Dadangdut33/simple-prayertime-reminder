import fetch from 'electron-fetch';
import { configInterface, getPosition_absolute_I } from 'main/interfaces';
const cities = require('all-the-cities');

/**
 * @deprecated The method should not be used
 */
export const verifyKey = async (key: string) => {
	const url = `https://api.freegeoip.app/json/?apikey=${key}`;
	let success = true,
		data;
	try {
		const res = await fetch(url);
		/**
		 * Possible case:
		 * - Invalid authentication credentials
		 * - No API key found in request (Should not actually happen)
		 */
		if (res.status !== 200) success = false;

		data = await res.json();
	} catch (err) {
		/**
		 * - No internet connection
		 */
		success = false;
		data = err;
	} finally {
		return { success, data };
	}
};

export const getLatLong = async () => {
	const url = `http://www.geoplugin.net/json.gp`;
	let success = true,
		data;
	try {
		const res = await fetch(url);
		if (res.status !== 200) success = false;

		data = await res.json();
	} catch (err) {
		/**
		 * - No internet connection
		 */
		success = false;
		data = err;
	} finally {
		return { success, data };
	}
};

export const getLatLong_FromCitiesName = (citySearch: string) => {
	let success = true,
		result = cities.filter((city: any) => city.name.match(citySearch.charAt(0).toUpperCase() + citySearch.slice(1)));

	// not found
	if (result.length === 0) success = false;

	return { success, result };
};

export const getPosition_absolute = async (_appConfig: configInterface): Promise<getPosition_absolute_I> => {
	const dataPos = await getLatLong();
	let city = '',
		latitude = '0',
		longitude = '0';

	if (!dataPos.success) {
		// if fail, get from city name
		const dataPosTry_2 = getLatLong_FromCitiesName(Intl.DateTimeFormat().resolvedOptions().timeZone === 'utc' ? 'utc' : Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[1]);

		if (dataPosTry_2.success) {
			city = dataPosTry_2.result[0].name;
			latitude = dataPosTry_2.result[0].loc.coordinates[1];
			longitude = dataPosTry_2.result[0].loc.coordinates[0];
		}
	} else {
		// successfully get lat long from the api
		city = dataPos.data.geoplugin_city;
		latitude = dataPos.data.geoplugin_latitude;
		longitude = dataPos.data.geoplugin_longitude;
	}

	return { city, latitude, longitude };
};
