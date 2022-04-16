import { useState } from 'react';
import { cacheDataInterface, configInterface } from 'main/interfaces';

// MUI elements
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

// Datepicker
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CalendarPicker } from '@mui/x-date-pickers/CalendarPicker';

// Date parser
import Moment from 'moment-timezone';
const moment = require('moment-hijri');
moment.locale('en');

export const Calendar = () => {
	const { fajr, sunrise, dhuhr, asr, maghrib, isha } = window.electron.ipcRenderer.sendSync('get-cached') as cacheDataInterface;
	const timezone = window.electron.ipcRenderer.sendSync('get-timezone') as string;
	const appSettings = window.electron.ipcRenderer.sendSync('get-config') as configInterface;

	const [pt_fajr, setPt_fajr] = useState<string>(new Date(new Date(fajr.toString()).valueOf() + appSettings.calcOption.adjustments.fajr * 60000).toString());
	const [pt_sunrise, setPt_sunrise] = useState<string>(new Date(new Date(sunrise.toString()).valueOf() + appSettings.calcOption.adjustments.sunrise * 60000).toString());
	const [pt_dhuhr, setPt_dhuhr] = useState<string>(new Date(new Date(dhuhr.toString()).valueOf() + appSettings.calcOption.adjustments.dhuhr * 60000).toString());
	const [pt_asr, setPt_asr] = useState<string>(new Date(new Date(asr.toString()).valueOf() + appSettings.calcOption.adjustments.asr * 60000).toString());
	const [pt_maghrib, setPt_maghrib] = useState<string>(new Date(new Date(maghrib.toString()).valueOf() + appSettings.calcOption.adjustments.maghrib * 60000).toString());
	const [pt_isha, setPt_isha] = useState<string>(new Date(new Date(isha.toString()).valueOf() + appSettings.calcOption.adjustments.isha * 60000).toString());

	const [selected, setSelected] = useState<Date | null>(new Date());
	return (
		<>
			<CssBaseline />
			<Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', justifyContent: 'center', color: 'text.primary', borderRadius: 1, p: 3, mt: 1 }}>
				<LocalizationProvider dateAdapter={AdapterDateFns}>
					<Grid item xs={12} md={6}>
						<CalendarPicker
							date={selected}
							onChange={(newValue) => {
								setSelected(newValue);
								const pt = window.electron.ipcRenderer.sendSync('get-this-pt', newValue?.toString()) as any;
								// set new prayer times with the adjustment
								setPt_fajr(new Date(new Date(pt.fajrTime).valueOf() + appSettings.calcOption.adjustments.fajr * 60000).toString());
								setPt_sunrise(new Date(new Date(pt.sunriseTime).valueOf() + appSettings.calcOption.adjustments.sunrise * 60000).toString());
								setPt_dhuhr(new Date(new Date(pt.dhuhrTime).valueOf() + appSettings.calcOption.adjustments.dhuhr * 60000).toString());
								setPt_asr(new Date(new Date(pt.asrTime).valueOf() + appSettings.calcOption.adjustments.asr * 60000).toString());
								setPt_maghrib(new Date(new Date(pt.maghribTime).valueOf() + appSettings.calcOption.adjustments.maghrib * 60000).toString());
								setPt_isha(new Date(new Date(pt.ishaTime).valueOf() + appSettings.calcOption.adjustments.isha * 60000).toString());
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
							{moment(selected).tz(timezone).format('iD iMMMM iYYYY')}
						</span>
					</Box>
					<Stack direction='row' divider={<Divider orientation='vertical' flexItem />} spacing={2} sx={{ mt: 3, justifyContent: 'space-between' }}>
						<Box sx={{ display: 'flex', flexDirection: 'column' }}>
							<div>
								<strong>
									{Moment(pt_fajr)
										.tz(timezone)
										.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
								</strong>
								<span className='prayername'>Fajr</span>
							</div>
							<div>
								<strong>
									{Moment(pt_sunrise)
										.tz(timezone)
										.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
								</strong>
								<span className='prayername'>Sunrise</span>
							</div>
							<div>
								<strong>
									{Moment(pt_dhuhr)
										.tz(timezone)
										.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
								</strong>
								<span className='prayername'>Dhuhr</span>
							</div>
						</Box>
						<Box sx={{ display: 'flex', flexDirection: 'column' }}>
							<div>
								<strong>
									{Moment(pt_asr)
										.tz(timezone)
										.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
								</strong>
								<span className='prayername'>Asr</span>
							</div>
							<div>
								<strong>
									{Moment(pt_maghrib)
										.tz(timezone)
										.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
								</strong>
								<span className='prayername'>Maghrib</span>
							</div>
							<div>
								<strong>
									{Moment(pt_isha)
										.tz(timezone)
										.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
								</strong>
								<span className='prayername'>Isha</span>
							</div>
						</Box>
					</Stack>
				</Box>
			</Box>
		</>
	);
};
