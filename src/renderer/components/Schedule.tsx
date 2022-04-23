import { useState } from 'react';
import { configInterface, getPrayerTimes_I } from 'main/interfaces';

// MUI elements
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Fade from '@mui/material/Fade';

// Datepicker
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CalendarPicker } from '@mui/x-date-pickers/CalendarPicker';

// Date parser
import Moment from 'moment-timezone';
const moment = require('moment-hijri');
moment.locale('en');

export const Schedule = () => {
	const { fajrTime, sunriseTime, dhuhrTime, asrTime, maghribTime, ishaTime } = window.electron.ipcRenderer.sendSync('get-this-pt', '') as getPrayerTimes_I;
	const timezone = window.electron.ipcRenderer.sendSync('get-timezone') as string;
	const appSettings = window.electron.ipcRenderer.sendSync('get-config') as configInterface;

	const [pt_fajr, setPt_fajr] = useState<string>(fajrTime);
	const [pt_sunrise, setPt_sunrise] = useState<string>(sunriseTime);
	const [pt_dhuhr, setPt_dhuhr] = useState<string>(dhuhrTime);
	const [pt_asr, setPt_asr] = useState<string>(asrTime);
	const [pt_maghrib, setPt_maghrib] = useState<string>(maghribTime);
	const [pt_isha, setPt_isha] = useState<string>(ishaTime);

	const [selected, setSelected] = useState<Date | null>(new Date());

	return (
		<>
			<CssBaseline />
			<Fade in={true}>
				<Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', justifyContent: 'center', color: 'text.primary', borderRadius: 1, p: 3, mt: 1 }}>
					<LocalizationProvider dateAdapter={AdapterDateFns}>
						<Grid item xs={12} md={6}>
							<CalendarPicker
								date={selected}
								onChange={(newValue) => {
									setSelected(newValue);
									const pt = window.electron.ipcRenderer.sendSync('get-this-pt', newValue?.toString()) as getPrayerTimes_I;
									// set new prayer times with the adjustment
									setPt_fajr(pt.fajrTime);
									setPt_sunrise(pt.sunriseTime);
									setPt_dhuhr(pt.dhuhrTime);
									setPt_asr(pt.asrTime);
									setPt_maghrib(pt.maghribTime);
									setPt_isha(pt.ishaTime);
								}}
								minDate={new Date('1937-03-14')}
								// hijri calendar have to be limited to 2076...
								// I don't think this software will even reach that point but just to be sure...
								maxDate={new Date() < new Date('2076-11-26') ? new Date('2076-11-26') : null}
							/>
						</Grid>
					</LocalizationProvider>
					<Box sx={{ display: 'flex', flexDirection: 'column' }}>
						<Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'start' }}>
							{Moment(selected).tz(timezone).format('dddd, D MMMM YYYY')} -{' '}
							<span className='subtle-text' style={{ marginLeft: '3px' }}>
								{appSettings.hijriCalendarOffset < 0
									? moment(selected).subtract(Math.abs(appSettings.hijriCalendarOffset), 'days').tz(timezone).format('iD iMMMM iYYYY')
									: moment(selected).add(appSettings.hijriCalendarOffset, 'days').tz(timezone).format('iD iMMMM iYYYY')}
							</span>
						</Box>
						<Stack direction='row' divider={<Divider orientation='vertical' flexItem />} spacing={2} sx={{ mt: 3, justifyContent: 'space-between' }}>
							<Box sx={{ display: 'flex', flexDirection: 'column' }}>
								<div>
									<strong>
										{Moment(new Date(pt_fajr))
											.tz(timezone)
											.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
									</strong>
									<span className='prayername'>Fajr</span>
								</div>
								<div>
									<strong>
										{Moment(new Date(pt_sunrise))
											.tz(timezone)
											.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
									</strong>
									<span className='prayername'>Sunrise</span>
								</div>
								<div>
									<strong>
										{Moment(new Date(pt_dhuhr))
											.tz(timezone)
											.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
									</strong>
									<span className='prayername'>Dhuhr</span>
								</div>
							</Box>
							<Box sx={{ display: 'flex', flexDirection: 'column' }}>
								<div>
									<strong>
										{Moment(new Date(pt_asr))
											.tz(timezone)
											.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
									</strong>
									<span className='prayername'>Asr</span>
								</div>
								<div>
									<strong>
										{Moment(new Date(pt_maghrib))
											.tz(timezone)
											.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
									</strong>
									<span className='prayername'>Maghrib</span>
								</div>
								<div>
									<strong>
										{Moment(new Date(pt_isha))
											.tz(timezone)
											.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
									</strong>
									<span className='prayername'>Isha</span>
								</div>
							</Box>
						</Stack>
					</Box>
				</Box>
			</Fade>
		</>
	);
};
