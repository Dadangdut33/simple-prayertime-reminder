import fetch from 'electron-fetch';
import { configInterface } from './files';
const cities = require('all-the-cities');

export const getLatLong = async (config: configInterface) => {
	const url = `https://api.freegeoip.app/json/?apikey=${config.geoLocAPIKey !== '' ? config.geoLocAPIKey : `074b03c0-b9a6-11ec-a359-d768e44d2b27`}`;
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
