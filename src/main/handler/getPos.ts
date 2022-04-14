import fetch from 'electron-fetch';
import { configInterface, getPosition_absolute_I } from 'main/interfaces';
const cities = require('all-the-cities');

export const getLatLong = async (config: configInterface) => {
	const url = `https://api.freegeoip.app/json/?apikey=${config.geoLocAPIKey.mode === 'manual' ? config.geoLocAPIKey.key : `074b03c0-b9a6-11ec-a359-d768e44d2b27`}`;
	let success = true,
		data;
	try {
		const res = await fetch(url);
		data = await res.json();
	} catch (err) {
		/**
		 * Possible case:
		 * - Invalid authentication credentials
		 * - No API key found in request (Should not actually happen)
		 * - Other possible errors (such as no internet and stuff...)
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

export const getPosition_absolute = async (appConfig: configInterface): Promise<getPosition_absolute_I> => {
	const dataPos = await getLatLong(appConfig);
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
		city = dataPos.data.city;
		latitude = dataPos.data.latitude;
		longitude = dataPos.data.longitude;
	}

	return { city, latitude, longitude };
};
