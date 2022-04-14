import fetch from 'electron-fetch';
import { configInterface } from 'main/interfaces';
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

export const getPosition_Safe = async (appConfig: configInterface) => {
	const dataPos = await getLatLong(appConfig);

	if (!dataPos.success) {
		// if fail, get from city name
		const dataPosTry_2 = getLatLong_FromCitiesName(Intl.DateTimeFormat().resolvedOptions().timeZone === 'utc' ? 'utc' : Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[1]);

		if (dataPosTry_2.success) {
			appConfig.locationOption.city = dataPosTry_2.result[0].name;
			appConfig.locationOption.latitude = dataPosTry_2.result[0].loc.coordinates[1];
			appConfig.locationOption.longitude = dataPosTry_2.result[0].loc.coordinates[0];
		}
	} else {
		// successfully get lat long from the api
		appConfig.locationOption.city = dataPos.data.city;
		appConfig.locationOption.latitude = dataPos.data.latitude;
		appConfig.locationOption.longitude = dataPos.data.longitude;
	}
};
