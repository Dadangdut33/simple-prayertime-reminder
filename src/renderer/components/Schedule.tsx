import { useState } from 'react';
import { configInterface, getPrayerTimes_I } from 'main/interfaces';

// export
import IconButton from '@mui/material/IconButton';
import IosShareIcon from '@mui/icons-material/IosShare';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
	const versionGet: string = window.electron.ipcRenderer.sendSync('get-version') as any;

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

	const getHijriDate = (date: Date | null) => {
		return appSettings.hijriCalendarOffset < 0
			? moment(date).subtract(Math.abs(appSettings.hijriCalendarOffset), 'days').tz(timezone).format('iD iMMMM iYYYY')
			: moment(date).add(appSettings.hijriCalendarOffset, 'days').tz(timezone).format('iD iMMMM iYYYY');
	};

	const getPtTime = (date: string) => {
		return Moment(new Date(date))
			.tz(timezone)
			.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A');
	};

	const exportSchedule = () => {
		// if endDate < startDate
		if (endDate!.valueOf() < startDate!.valueOf() && endDate!.valueOf() !== startDate!.valueOf()) {
			alert('End date must be greater than start date');
			return;
		}

		// get days dif between start and end date using moment
		const days = moment(endDate).diff(moment(startDate), 'days');
		if (exportType === 'csv' || exportType === 'xlsx' || exportType === "html") {
			const dataExport = [];
			dataExport.push([`Prayer schedules for ${appSettings.locationOption.city}`]);
			dataExport.push([`${Moment(startDate).tz(timezone).format('D MMMM YYYY')} - ${Moment(endDate).tz(timezone).format('D MMMM YYYY')}`]);
			dataExport.push(['']);
			dataExport.push(['']);
			dataExport.push(['Gregorian Date', 'Hijri Date', 'Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']);

			for (let i = 0; i <= days; i++) {
				const day = moment(startDate).add(i, 'days');
				const { fajrTime, sunriseTime, dhuhrTime, asrTime, maghribTime, ishaTime } = window.electron.ipcRenderer.sendSync('get-this-pt', day.format('YYYY-MM-DD')) as getPrayerTimes_I;
				dataExport.push([
					Moment(day).tz(timezone).format('D MMMM YYYY'),
					getHijriDate(day),
					getPtTime(fajrTime),
					getPtTime(sunriseTime),
					getPtTime(dhuhrTime),
					getPtTime(asrTime),
					getPtTime(maghribTime),
					getPtTime(ishaTime),
				]);
			}

			dataExport.push(['']);
			dataExport.push(['']);
			dataExport.push(['Details:']);
			dataExport.push(['Timezone: ' + timezone]);
			dataExport.push(['Latitude: ' + appSettings.locationOption.latitude]);
			dataExport.push(['Longitude: ' + appSettings.locationOption.longitude]);
			dataExport.push(['Hijri Offset: ' + appSettings.hijriCalendarOffset]);
			dataExport.push(['Calculation Method: ' + appSettings.calcOption.method]);
			dataExport.push(['Madhab: ' + appSettings.calcOption.madhab]);
			dataExport.push(['High Lat Rule: ' + appSettings.calcOption.highLatitudeRule]);
			dataExport.push([
				`Offsets: [${appSettings.calcOption.adjustments.fajr}, ${appSettings.calcOption.adjustments.sunrise}, ${appSettings.calcOption.adjustments.dhuhr}, ${appSettings.calcOption.adjustments.asr}, ${appSettings.calcOption.adjustments.maghrib}, ${appSettings.calcOption.adjustments.isha}]`,
			]);
			dataExport.push(['']);
			dataExport.push(['']);
			dataExport.push([`©Simple PrayerTime Reminder v${versionGet}`]);
			dataExport.push([`https://bit.ly/SPRRepo`]);
			dataExport.push([`${Moment().tz(timezone).format('D MMMM YYYY, h:mm:ss a')}`]);

			// save data
			const workBook = XLSX.utils.book_new();
			const workSheet = XLSX.utils.aoa_to_sheet(dataExport);
			XLSX.utils.book_append_sheet(workBook, workSheet, 'Sheet1');

			// save data
			XLSX.writeFile(workBook, `${appSettings.locationOption.city}_${Moment(startDate).tz(timezone).format('D MMMM YYYY')}_${Moment(endDate).tz(timezone).format('D MMMM YYYY')}.${exportType}`);
		} else
		if (exportType === "pdf") {
			const doc = new jsPDF();
			const dataExport = [];

			let pushLines = [];
			pushLines.push(`Prayer schedules for ${appSettings.locationOption.city}`);
			pushLines.push('');
			pushLines.push('Details:');
			pushLines.push('Timezone: ' + timezone);
			pushLines.push('Latitude: ' + appSettings.locationOption.latitude);
			pushLines.push('Longitude: ' + appSettings.locationOption.longitude);
			pushLines.push('Hijri Offset: ' + appSettings.hijriCalendarOffset);
			pushLines.push('Calculation Method: ' + appSettings.calcOption.method);
			pushLines.push('Madhab: ' + appSettings.calcOption.madhab);
			pushLines.push('High Lat Rule: ' + appSettings.calcOption.highLatitudeRule);
			pushLines.push(
				`Offsets: [${appSettings.calcOption.adjustments.fajr}, ${appSettings.calcOption.adjustments.sunrise}, ${appSettings.calcOption.adjustments.dhuhr}, ${appSettings.calcOption.adjustments.asr}, ${appSettings.calcOption.adjustments.maghrib}, ${appSettings.calcOption.adjustments.isha}]`,
			);
			pushLines.push('');
			pushLines.push(`©Simple PrayerTime Reminder v${versionGet}`);
			pushLines.push(`https://bit.ly/SPRRepo`);
			pushLines.push(`${Moment().tz(timezone).format('D MMMM YYYY, h:mm:ss a')}`);
			doc.text(pushLines, 10, 20)

			for (let i = 0; i <= days; i++) {
				const day = moment(startDate).add(i, 'days');
				const { fajrTime, sunriseTime, dhuhrTime, asrTime, maghribTime, ishaTime } = window.electron.ipcRenderer.sendSync('get-this-pt', day.format('YYYY-MM-DD')) as getPrayerTimes_I;
				dataExport.push([
					Moment(day).tz(timezone).format('D MMMM YYYY'),
					getHijriDate(day),
					getPtTime(fajrTime),
					getPtTime(sunriseTime),
					getPtTime(dhuhrTime),
					getPtTime(asrTime),
					getPtTime(maghribTime),
					getPtTime(ishaTime),
				]);
			}

			autoTable(doc, {
				startY: 120,
				margin: 10,
				head: [['Gregorian Date', 'Hijri Date', 'Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']],
				body: dataExport
			});

			doc.save(`${appSettings.locationOption.city}_${Moment(startDate).tz(timezone).format('D MMMM YYYY')}_${Moment(endDate).tz(timezone).format('D MMMM YYYY')}.pdf`);
		}

		setModalOpened(!modalOpened);
	};

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
									({getHijriDate(startDate)})
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
									({getHijriDate(endDate)})
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
									<MenuItem key={'xlsx'} value={'xlsx'}>
										Excel (.xlsx)
									</MenuItem>
									<MenuItem key={'html'} value={'html'}>
										HTML
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
						onClick={() => {
							exportSchedule();
						}}
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
								{getHijriDate(selected)}
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
									<strong>{getPtTime(pt_fajr)}</strong>
									<span className='prayername'>Fajr</span>
								</div>
								<div>
									<strong>{getPtTime(pt_sunrise)}</strong>
									<span className='prayername'>Sunrise</span>
								</div>
								<div>
									<strong>{getPtTime(pt_dhuhr)}</strong>
									<span className='prayername'>Dhuhr</span>
								</div>
							</Box>
							<Box sx={{ display: 'flex', flexDirection: 'column' }}>
								<div>
									<strong>{getPtTime(pt_asr)}</strong>
									<span className='prayername'>Asr</span>
								</div>
								<div>
									<strong>{getPtTime(pt_maghrib)}</strong>
									<span className='prayername'>Maghrib</span>
								</div>
								<div>
									<strong>{getPtTime(pt_isha)}</strong>
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
