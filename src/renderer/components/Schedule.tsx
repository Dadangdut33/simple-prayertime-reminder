import { useState } from 'react';
import { configInterface, getPrayerTimes_I } from 'main/interfaces';

// export
import IconButton from '@mui/material/IconButton';
import IosShareIcon from '@mui/icons-material/IosShare';
// @ts-ignore
import { CSVDownload } from 'react-csv';

// modal
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';
const centeredModal = {
	position: 'absolute' as 'absolute',
	top: '50%',
	left: '50%',
	transform: 'translate(-50%, -50%)',
	width: '700px',
	bgcolor: 'background.paper',
	borderRadius: '4px',
	boxShadow: 24,
};

// MUI elements
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Fade from '@mui/material/Fade';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

// Datepicker
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CalendarPicker } from '@mui/x-date-pickers/CalendarPicker';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';

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
	const [modalOpened, setModalOpened] = useState(false);

	const [startDate, setStartDate] = useState<Date | null>(new Date()); // start date
	const [endDate, setEndDate] = useState<Date | null>(new Date()); // end date
	const [exportType, setExportType] = useState<string>('pdf'); // export type

	return (
		<>
			<CssBaseline />
			<Modal open={modalOpened}>
				<Box sx={centeredModal}>
					<Box
						sx={{
							p: 3,
							display: 'flex',
							flexDirection: 'column',
						}}
					>
						<Typography sx={{ ml: 'auto', mr: 'auto' }} variant='h6'>
							Export Schedule
						</Typography>
						<Typography sx={{ ml: 'auto', mr: 'auto', display: 'flex', flexDirection: 'row', gap: '8px', pt: 1 }} variant='subtitle1' component='h6'>
							<Box
								sx={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
								}}
							>
								{Moment(startDate).tz(timezone).format('dddd, D MMMM YYYY')}
								<Typography variant='caption' display='block' className='subtle-text'>
									(
									{appSettings.hijriCalendarOffset < 0
										? moment(startDate).subtract(Math.abs(appSettings.hijriCalendarOffset), 'days').tz(timezone).format('iD iMMMM iYYYY')
										: moment(startDate).add(appSettings.hijriCalendarOffset, 'days').tz(timezone).format('iD iMMMM iYYYY')}
									)
								</Typography>
							</Box>
							{' - '}
							<Box
								sx={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
								}}
							>
								{Moment(endDate).tz(timezone).format('dddd, D MMMM YYYY')}
								<Typography variant='caption' display='block' className='subtle-text'>
									(
									{appSettings.hijriCalendarOffset < 0
										? moment(endDate).subtract(Math.abs(appSettings.hijriCalendarOffset), 'days').tz(timezone).format('iD iMMMM iYYYY')
										: moment(endDate).add(appSettings.hijriCalendarOffset, 'days').tz(timezone).format('iD iMMMM iYYYY')}
									)
								</Typography>
							</Box>
						</Typography>
						<Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', pt: 3 }}>
							<Box sx={{ display: 'flex', flexDirection: 'column', ml: 'auto', mr: 'auto' }}>
								<LocalizationProvider dateAdapter={AdapterDateFns}>
									<DesktopDatePicker label='Start Date (dd/MM/yyyy)' inputFormat='dd/MM/yyyy' value={startDate} onChange={(date) => setStartDate(date)} renderInput={(params) => <TextField {...params} />} />
								</LocalizationProvider>
							</Box>
							<Box sx={{ display: 'flex', flexDirection: 'column', ml: 'auto', mr: 'auto' }}>
								<LocalizationProvider dateAdapter={AdapterDateFns}>
									<DesktopDatePicker label='End Date (dd/MM/yyyy)' inputFormat='dd/MM/yyyy' value={endDate} onChange={(date) => setEndDate(date)} renderInput={(params) => <TextField {...params} />} />
								</LocalizationProvider>
							</Box>
						</Box>

						<span style={{ paddingTop: '1rem', paddingLeft: '40px', paddingRight: '40px' }}>
							<FormControl fullWidth>
								<InputLabel id='export-to'>Export to</InputLabel>
								<Select value={exportType} label='Export to' labelId='export-to' onChange={(e) => setExportType(e.target.value)}>
									<MenuItem key={'pdf'} value={'pdf'}>
										PDF
									</MenuItem>
									<MenuItem key={'csv'} value={'csv'}>
										CSV
									</MenuItem>
								</Select>
							</FormControl>
						</span>
					</Box>
					<Button
						sx={{
							width: 350,
							borderRadius: 0,
						}}
						variant='contained'
						onClick={() => setModalOpened(!modalOpened)}
					>
						OK
					</Button>
					<Button
						sx={{
							width: 350,
							borderRadius: 0,
						}}
						variant='contained'
						onClick={() => setModalOpened(!modalOpened)}
						color='error'
					>
						Cancel
					</Button>
				</Box>
			</Modal>

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
							<span style={{ position: 'relative' }}>
								<IconButton onClick={() => setModalOpened(!modalOpened)} size='small' style={{ left: '.3rem', bottom: '0px', position: 'absolute' }} color='primary'>
									<IosShareIcon style={{ fontSize: '1.1rem' }} />
								</IconButton>
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
};;;;;;;;;
