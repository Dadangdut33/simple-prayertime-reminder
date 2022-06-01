import { ColorModeContextInterface } from 'renderer/interfaces';
import { configInterface, getPosition_absolute_I, calcMethod, madhab, highLatitudeRule_T, prayerTimes } from 'main/interfaces';
import { useContext, forwardRef, useState, ChangeEvent, useEffect } from 'react';

// MUI
import Fade from '@mui/material/Fade';
import Divider from '@mui/material/Divider';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
	return <MuiAlert elevation={6} ref={ref} variant='filled' {...props} />;
});

// Form
import IconButton from '@mui/material/IconButton';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Checkbox from '@mui/material/Checkbox';
import MuiInput from '@mui/material/Input';
import Autocomplete from '@mui/material/Autocomplete';
import Select from '@mui/material/Select';
import FormGroup from '@mui/material/FormGroup';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';

// Dialogbox
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

// Icons
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import SyncIcon from '@mui/icons-material/Sync';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import Button from '@mui/material/Button';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import KeyIcon from '@mui/icons-material/Key';
import MiscellaneousServicesOutlinedIcon from '@mui/icons-material/MiscellaneousServicesOutlined';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';

export const Settings = ({ appTheme, ColorModeContext, setChangesMade }: any) => {
	// config on tab open
	const initialConfig = window.electron.ipcRenderer.sendSync('get-config') as configInterface;
	const [currentConfig, setCurrentConfig] = useState<configInterface>(window.electron.ipcRenderer.sendSync('get-config') as configInterface); // current config
	const [destination, setDestination] = useState<string>(''); // destination path

	// --------------------------------------------------------------------------
	// calcOption
	const [calcOptMode, setCalcOptMode] = useState<'default' | 'manual'>(currentConfig.calcOption.mode);
	const [calcOptMethod, setCalcOptMethod] = useState<calcMethod>(currentConfig.calcOption.method);
	const [calcOptMadhab, setCalcOptMadhab] = useState<madhab>(currentConfig.calcOption.madhab);
	const [calcOptHighLatRule, setCalcOptHighLatRule] = useState<highLatitudeRule_T>(currentConfig.calcOption.highLatitudeRule);
	const [calcOptAdjustment_Fajr, setCalcOptAdjustment_Fajr] = useState<number>(currentConfig.calcOption.adjustments.fajr);
	const [calcOptAdjustment_Sunrise, setCalcOptAdjustment_Sunrise] = useState<number>(currentConfig.calcOption.adjustments.sunrise);
	const [calcOptAdjustment_Dhuhr, setCalcOptAdjustment_Dhuhr] = useState<number>(currentConfig.calcOption.adjustments.dhuhr);
	const [calcOptAdjustment_Asr, setCalcOptAdjustment_Asr] = useState<number>(currentConfig.calcOption.adjustments.asr);
	const [calcOptAdjustment_Maghrib, setCalcOptAdjustment_Maghrib] = useState<number>(currentConfig.calcOption.adjustments.maghrib);
	const [calcOptAdjustment_Isha, setCalcOptAdjustment_Isha] = useState<number>(currentConfig.calcOption.adjustments.isha);

	const methodList = ['MuslimWorldLeague', 'Egyptian', 'Karachi', 'UmmAlQura', 'Dubai', 'MoonsightingCommittee', 'NorthAmerica', 'Kuwait', 'Qatar', 'Singapore', 'Tehran', 'Turkey'];
	const madhabList = ['Shafi', 'Hanafi'];
	const highLatRuleList = ['MiddleOfTheNight', 'SeventhOfTheNight', 'TwilightAngle'];

	const handleCalcOptModeChange = (event: ChangeEvent<HTMLInputElement>) => {
		setCalcOptMode(event.target.value as 'default' | 'manual');

		if (event.target.value === 'default') {
			setCalcOptMethod('MuslimWorldLeague');
			setCalcOptMadhab('Shafi');
			setCalcOptHighLatRule('TwilightAngle');
		}
		checkChanges();
	};

	const calcOptSelectMap = {
		method: setCalcOptMethod,
		madhab: setCalcOptMadhab,
		highLatitudeRule: setCalcOptHighLatRule,
	};

	const handleCalcOptSelectChange = (event: ChangeEvent<HTMLSelectElement>, map: 'method' | 'madhab' | 'highLatitudeRule') => {
		calcOptSelectMap[map](event.target.value as any);

		checkChanges();
	};

	const adjustChangeMap: any = {
		fajr: setCalcOptAdjustment_Fajr,
		sunrise: setCalcOptAdjustment_Sunrise,
		dhuhr: setCalcOptAdjustment_Dhuhr,
		asr: setCalcOptAdjustment_Asr,
		maghrib: setCalcOptAdjustment_Maghrib,
		isha: setCalcOptAdjustment_Isha,
	};

	const varAdjustChangeMap: any = {
		fajr: calcOptAdjustment_Fajr,
		sunrise: calcOptAdjustment_Sunrise,
		dhuhr: calcOptAdjustment_Dhuhr,
		asr: calcOptAdjustment_Asr,
		maghrib: calcOptAdjustment_Maghrib,
		isha: calcOptAdjustment_Isha,
	};

	const handleCalcOptAdjustmentChange = (event: ChangeEvent<HTMLInputElement>, map: prayerTimes) => {
		adjustChangeMap[map](Number(event.target.value) || 0);
		checkChanges();
	};

	const handleBlurCalcOptAdjustmentChange = (map: prayerTimes) => {
		if (varAdjustChangeMap[map] < -300) adjustChangeMap[map](-300);
		else if (varAdjustChangeMap[map] > 300) adjustChangeMap[map](300);
	};

	// --------------------------------------------------------------------------
	// reminder option
	const [remind_fajr_remindWhenOnTime, setRemind_fajr_remindWhenOnTime] = useState<boolean>(currentConfig.reminderOption.fajr.remindWhenOnTime);
	const [remind_fajr_earlyReminder, setRemind_fajr_earlyReminder] = useState<boolean>(currentConfig.reminderOption.fajr.earlyReminder);
	const [remind_fajr_earlyTime, setRemind_fajr_earlyTime] = useState<number>(currentConfig.reminderOption.fajr.earlyTime);
	const [remind_fajr_intrusive, setRemind_fajr_intrusive] = useState<boolean>(currentConfig.reminderOption.fajr.intrusiveNotification);

	const [remind_sunrise_remindWhenOnTime, setRemind_sunrise_remindWhenOnTime] = useState<boolean>(currentConfig.reminderOption.sunrise.remindWhenOnTime);
	const [remind_sunrise_earlyReminder, setRemind_sunrise_earlyReminder] = useState<boolean>(currentConfig.reminderOption.sunrise.earlyReminder);
	const [remind_sunrise_earlyTime, setRemind_sunrise_earlyTime] = useState<number>(currentConfig.reminderOption.sunrise.earlyTime);
	const [remind_sunrise_intrusive, setRemind_sunrise_intrusive] = useState<boolean>(currentConfig.reminderOption.sunrise.intrusiveNotification);

	const [remind_dhuhr_remindWhenOnTime, setRemind_dhuhr_remindWhenOnTime] = useState<boolean>(currentConfig.reminderOption.dhuhr.remindWhenOnTime);
	const [remind_dhuhr_earlyReminder, setRemind_dhuhr_earlyReminder] = useState<boolean>(currentConfig.reminderOption.dhuhr.earlyReminder);
	const [remind_dhuhr_earlyTime, setRemind_dhuhr_earlyTime] = useState<number>(currentConfig.reminderOption.dhuhr.earlyTime);
	const [remind_dhuhr_intrusive, setRemind_dhuhr_intrusive] = useState<boolean>(currentConfig.reminderOption.dhuhr.intrusiveNotification);

	const [remind_asr_remindWhenOnTime, setRemind_asr_remindWhenOnTime] = useState<boolean>(currentConfig.reminderOption.asr.remindWhenOnTime);
	const [remind_asr_earlyReminder, setRemind_asr_earlyReminder] = useState<boolean>(currentConfig.reminderOption.asr.earlyReminder);
	const [remind_asr_earlyTime, setRemind_asr_earlyTime] = useState<number>(currentConfig.reminderOption.asr.earlyTime);
	const [remind_asr_intrusive, setRemind_asr_intrusive] = useState<boolean>(currentConfig.reminderOption.asr.intrusiveNotification);

	const [remind_maghrib_remindWhenOnTime, setRemind_maghrib_remindWhenOnTime] = useState<boolean>(currentConfig.reminderOption.maghrib.remindWhenOnTime);
	const [remind_maghrib_earlyReminder, setRemind_maghrib_earlyReminder] = useState<boolean>(currentConfig.reminderOption.maghrib.earlyReminder);
	const [remind_maghrib_earlyTime, setRemind_maghrib_earlyTime] = useState<number>(currentConfig.reminderOption.maghrib.earlyTime);
	const [remind_maghrib_intrusive, setRemind_maghrib_intrusive] = useState<boolean>(currentConfig.reminderOption.maghrib.intrusiveNotification);

	const [remind_isha_remindWhenOnTime, setRemind_isha_remindWhenOnTime] = useState<boolean>(currentConfig.reminderOption.isha.remindWhenOnTime);
	const [remind_isha_earlyReminder, setRemind_isha_earlyReminder] = useState<boolean>(currentConfig.reminderOption.isha.earlyReminder);
	const [remind_isha_earlyTime, setRemind_isha_earlyTime] = useState<number>(currentConfig.reminderOption.isha.earlyTime);
	const [remind_isha_intrusive, setRemind_isha_intrusive] = useState<boolean>(currentConfig.reminderOption.isha.intrusiveNotification);

	const remindWhenOnTimeChangeMap = {
		fajr: setRemind_fajr_remindWhenOnTime,
		sunrise: setRemind_sunrise_remindWhenOnTime,
		dhuhr: setRemind_dhuhr_remindWhenOnTime,
		asr: setRemind_asr_remindWhenOnTime,
		maghrib: setRemind_maghrib_remindWhenOnTime,
		isha: setRemind_isha_remindWhenOnTime,
	};

	const earlyReminderChangeMap = {
		fajr: setRemind_fajr_earlyReminder,
		sunrise: setRemind_sunrise_earlyReminder,
		dhuhr: setRemind_dhuhr_earlyReminder,
		asr: setRemind_asr_earlyReminder,
		maghrib: setRemind_maghrib_earlyReminder,
		isha: setRemind_isha_earlyReminder,
	};

	const earlyTimeChangeMap = {
		fajr: setRemind_fajr_earlyTime,
		sunrise: setRemind_sunrise_earlyTime,
		dhuhr: setRemind_dhuhr_earlyTime,
		asr: setRemind_asr_earlyTime,
		maghrib: setRemind_maghrib_earlyTime,
		isha: setRemind_isha_earlyTime,
	};

	const varEarlyTimeChangeMap = {
		fajr: remind_fajr_earlyTime,
		sunrise: remind_sunrise_earlyTime,
		dhuhr: remind_dhuhr_earlyTime,
		asr: remind_asr_earlyTime,
		maghrib: remind_maghrib_earlyTime,
		isha: remind_isha_earlyTime,
	};

	const intrusiveChangeMap = {
		fajr: setRemind_fajr_intrusive,
		sunrise: setRemind_sunrise_intrusive,
		dhuhr: setRemind_dhuhr_intrusive,
		asr: setRemind_asr_intrusive,
		maghrib: setRemind_maghrib_intrusive,
		isha: setRemind_isha_intrusive,
	};

	const handleRemindWhenOnTimeChange = (event: ChangeEvent<HTMLInputElement>, map: prayerTimes) => {
		remindWhenOnTimeChangeMap[map](event.target.checked);
		checkChanges();
	};

	const handleEarlyReminderChange = (event: ChangeEvent<HTMLInputElement>, map: prayerTimes) => {
		earlyReminderChangeMap[map](event.target.checked);
		checkChanges();
	};

	const handleEarlyTimeChange = (event: ChangeEvent<HTMLInputElement>, map: prayerTimes) => {
		earlyTimeChangeMap[map](Number(event.target.value) || 1);
		checkChanges();
	};

	const blurEarlyTime = (map: prayerTimes) => {
		if (varEarlyTimeChangeMap[map] < 1) earlyTimeChangeMap[map](1);
		else if (varEarlyTimeChangeMap[map] > 60) earlyTimeChangeMap[map](60);
	};

	const handleIntrusiveChange = (event: ChangeEvent<HTMLInputElement>, map: prayerTimes) => {
		intrusiveChangeMap[map](event.target.checked);
		checkChanges();
	};

	// --------------------------------------------------------------------------
	// location
	const [locMode, setLocMode] = useState<'auto' | 'manual'>(currentConfig.locationOption.mode);
	const [locCity, setLocCity] = useState(currentConfig.locationOption.city);
	const [locLat, setLocLat] = useState(currentConfig.locationOption.latitude);
	const [locLang, setLocLang] = useState(currentConfig.locationOption.longitude);
	const [locUpdateEveryStartup, setLocUpdateEveryStartup] = useState(currentConfig.locationOption.updateEveryStartup);
	const handleLocModeChange = (e: ChangeEvent<HTMLInputElement>) => {
		setLocMode(e.target.value as 'auto' | 'manual');
		// if auto, fetch location
		if (e.target.value === 'auto') {
			if (currentConfig.locationOption.mode === 'auto') {
				setLocCity(currentConfig.locationOption.city);
				setLocLat(currentConfig.locationOption.latitude);
				setLocLang(currentConfig.locationOption.longitude);
			} else {
				const { city, latitude, longitude } = window.electron.ipcRenderer.sendSync('get-location-auto', currentConfig) as getPosition_absolute_I;
				setLocCity(city);
				setLocLat(latitude);
				setLocLang(longitude);
			}
		}
		checkChanges();
	};

	const handleCityChange = (e: ChangeEvent<HTMLInputElement>) => {
		setLocCity(e.target.value);
		checkChanges();
	};

	const handleLatChange = (e: ChangeEvent<HTMLInputElement>) => {
		setLocLat(e.target.value);
		checkChanges();
	};

	const handleLangChange = (e: ChangeEvent<HTMLInputElement>) => {
		setLocLang(e.target.value);
		checkChanges();
	};

	const handleLocUpdateEveryStartupChange = (e: ChangeEvent<HTMLInputElement>) => {
		setLocUpdateEveryStartup(e.target.checked);
		checkChanges();
	};

	const getCityLatLang_Auto = () => {
		const { city, latitude, longitude, successGet } = window.electron.ipcRenderer.sendSync('get-location-auto', currentConfig) as getPosition_absolute_I;

		if (successGet) {
			setLocCity(city);
			setLocLat(latitude);
			setLocLang(longitude);

			// snackbar
			setShowSnackbar(true);
			setSnackbarMsg('Location fetched successfully!');
			setSnackbarSeverity('success');
			checkChanges();
		} else {
			// snackbar
			setShowSnackbar(true);
			setSnackbarMsg('Failed to fetch location!');
			setSnackbarSeverity('error');
		}
	};

	const getCityLatLang_Manual = () => {
		const { success, result }: any = window.electron.ipcRenderer.sendSync('get-location-manual', locCity);
		if (!success) {
			setShowSnackbar(true);
			setSnackbarSeverity('error');
			setSnackbarMsg("Couldn't found city's name. Please check your input. (There might be typo)");
			return;
		} else {
			setShowSnackbar(true);
			setSnackbarSeverity('success');
			setSnackbarMsg('Location fetched successfully! City inputted has been replaced with the data fetched.');
			setLocCity(result[0].name);
			setLocLat(result[0].loc.coordinates[1]);
			setLocLang(result[0].loc.coordinates[0]);
			checkChanges();
		}
	};

	// --------------------------------------------------------------------------
	// available tz
	const tzList = window.electron.ipcRenderer.sendSync('get-tz-list') as string[];

	// timezone
	const [tzMode, setTzMode] = useState<'auto' | 'manual'>(currentConfig.timezoneOption.mode);
	const [timezone, setTimezone] = useState<string>(currentConfig.timezoneOption.timezone);
	const [tzInput, setTzInput] = useState<string>('');

	const handleTzModeChange = (e: ChangeEvent<HTMLInputElement>) => {
		setTzMode(e.target.value as 'auto' | 'manual');
		if (e.target.value === 'auto') {
			const timezone = window.electron.ipcRenderer.sendSync('get-tz-auto', currentConfig) as string;
			setTimezone(timezone);
		}
		checkChanges();
	};

	const handleTimezoneChange = (_event: any, newValue: string | null) => {
		// not importing the interface for IDE performance sake
		setTimezone(newValue as string);
		// make sure something is always selected
		if (newValue === null) setTimezone(tzList[0]);
		checkChanges();
	};

	const handleTzInputChange = (_event: any, newValue: string) => {
		setTzInput(newValue as string);
	};

	// --------------------------------------------------------------------------
	// geoloc
	const [geolocMode, setGeolocMode] = useState<'auto' | 'manual'>(currentConfig.geoLocAPIKey.mode);
	const [geolocKey, setGeolocKey] = useState<string>(currentConfig.geoLocAPIKey.key);

	const handleGeolocModeChange = (e: ChangeEvent<HTMLInputElement>) => {
		setGeolocMode(e.target.value as 'auto' | 'manual');

		if (e.target.value === 'auto') setGeolocKey('');
		checkChanges();
	};

	const handleGeolocKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
		setGeolocKey(e.target.value);
		checkChanges();
	};

	const verifyKey = () => {
		const { success, data }: any = window.electron.ipcRenderer.sendSync('verify-geoloc-key', geolocKey);
		if (success) {
			setShowSnackbar(true);
			setSnackbarSeverity('success');
			setSnackbarMsg('API key verified successfully!');
		} else {
			setShowSnackbar(true);
			setSnackbarSeverity('error');
			setSnackbarMsg(data.message ? data.message : data); // error message
		}
	};

	// --------------------------------------------------------------------------

	// --------------------------------------------------------------------------
	// App Setting
	const colorMode = useContext(ColorModeContext) as ColorModeContextInterface;

	const handleColorModeChange = (_e: ChangeEvent<HTMLInputElement>) => {
		colorMode.toggleColorMode();
		checkChanges();
	};

	const [runAtStartup, setRunAtStartup] = useState(currentConfig.runAtStartup);
	const [checkUpdateStartup, setcheckUpdateStartup] = useState(currentConfig.checkUpdateAtStartup);
	const [clockStyle, setClockStyle] = useState(currentConfig.clockStyle);
	const [hijriCalendarOffset, setHijriCalendarOffset] = useState(currentConfig.hijriCalendarOffset);
	const [detectTimeChange, setDetectTimeChange] = useState(currentConfig.detectTimeChange);

	const handleHijriCalendarOffsetChange = (e: ChangeEvent<HTMLInputElement>) => {
		setHijriCalendarOffset(Number(e.target.value) || 0);
		checkChanges();
	};

	const handleBlurHijriCalendarOffset = () => {
		if (hijriCalendarOffset < -5) {
			setHijriCalendarOffset(-5);
		} else if (hijriCalendarOffset > 5) {
			setHijriCalendarOffset(5);
		}
	};

	const handleRunAtStartupChange = (e: ChangeEvent<HTMLInputElement>) => {
		setRunAtStartup(e.target.checked);
		checkChanges();
	};

	const handleCheckUpdateStartupChange = (e: ChangeEvent<HTMLInputElement>) => {
		setcheckUpdateStartup(e.target.checked);
		checkChanges();
	};

	const handleClockStyleChange = (e: any) => {
		setClockStyle(e.target.value as string);
		checkChanges();
	};

	const handleDetectTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
		setDetectTimeChange(e.target.checked);
		checkChanges();
	};

	// --------------------------------------------------------------------------
	// snackbar
	const [showSnackbar, setShowSnackbar] = useState<boolean>(false);
	const [snackbarMsg, setSnackbarMsg] = useState<string>('');
	const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info');

	// handle snackbar close
	const handleSnackbarClose = () => {
		setShowSnackbar(false);
	};

	// --------------------------------------------------------------------------
	// dialogbox
	const [dialogOpen, setDialogOpen] = useState<boolean>(false);
	const [currentDialog, setCurrentDialog] = useState<'save' | 'cancel' | 'changes'>('save');
	const handleDialogChangesMade = (yes = false) => {
		setChangesMade(false);
		setDialogOpen(false);
		if (yes) saveTheConfig();
		else {
			if (currentConfig.theme !== appTheme) colorMode.toggleColorMode();
			window.electron.ipcRenderer.send('invoke-page-change', destination);
		}
	};

	const handleDialogSave = (yes = false) => {
		setDialogOpen(false);
		if (yes) saveTheConfig();
	};

	const handleDialogCancel = (yes = false) => {
		setDialogOpen(false);
		if (yes) resetConfig();
	};

	const dialogMap: any = {
		changes: [handleDialogChangesMade, 'You have unsaved changes. Do you want to save them?'],
		save: [handleDialogSave, 'Are you sure you want to save the settings changes?'],
		cancel: [handleDialogCancel, 'Are you sure you want to cancel changes made?'],
	};

	// --------------------------------------------------------------------------
	const setInitialValue = () => {
		setCalcOptMode(initialConfig.calcOption.mode);
		setCalcOptMethod(initialConfig.calcOption.method);
		setCalcOptMadhab(initialConfig.calcOption.madhab);
		setCalcOptHighLatRule(initialConfig.calcOption.highLatitudeRule);
		setCalcOptAdjustment_Fajr(initialConfig.calcOption.adjustments.fajr);
		setCalcOptAdjustment_Sunrise(initialConfig.calcOption.adjustments.sunrise);
		setCalcOptAdjustment_Dhuhr(initialConfig.calcOption.adjustments.dhuhr);
		setCalcOptAdjustment_Asr(initialConfig.calcOption.adjustments.asr);
		setCalcOptAdjustment_Maghrib(initialConfig.calcOption.adjustments.maghrib);
		setCalcOptAdjustment_Isha(initialConfig.calcOption.adjustments.isha);
		setRemind_fajr_remindWhenOnTime(initialConfig.reminderOption.fajr.remindWhenOnTime);
		setRemind_fajr_earlyReminder(initialConfig.reminderOption.fajr.earlyReminder);
		setRemind_fajr_earlyTime(initialConfig.reminderOption.fajr.earlyTime);
		setRemind_fajr_intrusive(initialConfig.reminderOption.fajr.intrusiveNotification);
		setRemind_sunrise_remindWhenOnTime(initialConfig.reminderOption.sunrise.remindWhenOnTime);
		setRemind_sunrise_earlyReminder(initialConfig.reminderOption.sunrise.earlyReminder);
		setRemind_sunrise_earlyTime(initialConfig.reminderOption.sunrise.earlyTime);
		setRemind_sunrise_intrusive(initialConfig.reminderOption.sunrise.intrusiveNotification);
		setRemind_dhuhr_remindWhenOnTime(initialConfig.reminderOption.dhuhr.remindWhenOnTime);
		setRemind_dhuhr_earlyReminder(initialConfig.reminderOption.dhuhr.earlyReminder);
		setRemind_dhuhr_earlyTime(initialConfig.reminderOption.dhuhr.earlyTime);
		setRemind_dhuhr_intrusive(initialConfig.reminderOption.dhuhr.intrusiveNotification);
		setRemind_asr_remindWhenOnTime(initialConfig.reminderOption.asr.remindWhenOnTime);
		setRemind_asr_earlyReminder(initialConfig.reminderOption.asr.earlyReminder);
		setRemind_asr_earlyTime(initialConfig.reminderOption.asr.earlyTime);
		setRemind_asr_intrusive(initialConfig.reminderOption.asr.intrusiveNotification);
		setRemind_maghrib_remindWhenOnTime(initialConfig.reminderOption.maghrib.remindWhenOnTime);
		setRemind_maghrib_earlyReminder(initialConfig.reminderOption.maghrib.earlyReminder);
		setRemind_maghrib_earlyTime(initialConfig.reminderOption.maghrib.earlyTime);
		setRemind_maghrib_intrusive(initialConfig.reminderOption.maghrib.intrusiveNotification);
		setRemind_isha_remindWhenOnTime(initialConfig.reminderOption.isha.remindWhenOnTime);
		setRemind_isha_earlyReminder(initialConfig.reminderOption.isha.earlyReminder);
		setRemind_isha_earlyTime(initialConfig.reminderOption.isha.earlyTime);
		setRemind_isha_intrusive(initialConfig.reminderOption.isha.intrusiveNotification);
		setLocMode(initialConfig.locationOption.mode);
		setLocCity(initialConfig.locationOption.city);
		setLocLat(initialConfig.locationOption.latitude);
		setLocLang(initialConfig.locationOption.longitude);
		setLocUpdateEveryStartup(initialConfig.locationOption.updateEveryStartup);
		setTzMode(initialConfig.timezoneOption.mode);
		setTimezone(initialConfig.timezoneOption.timezone);
		setGeolocMode(initialConfig.geoLocAPIKey.mode);
		setGeolocKey(initialConfig.geoLocAPIKey.key);
		setRunAtStartup(initialConfig.runAtStartup);
		setcheckUpdateStartup(initialConfig.checkUpdateAtStartup);
		setClockStyle(initialConfig.clockStyle);
		setHijriCalendarOffset(initialConfig.hijriCalendarOffset);
		setDetectTimeChange(initialConfig.detectTimeChange);
	};

	// reset config
	const resetConfig = () => {
		if (currentConfig.theme !== appTheme) colorMode.toggleColorMode();
		setChangesMade(false);
		setCurrentConfig(initialConfig);

		// setting var
		setInitialValue();

		// snackbar
		setSnackbarMsg('Canceled changes made.');
		setSnackbarSeverity('info');
		setShowSnackbar(true);
	};

	const storeConfig = () => {
		// update config
		currentConfig.calcOption.mode = calcOptMode;
		currentConfig.calcOption.method = calcOptMethod;
		currentConfig.calcOption.madhab = calcOptMadhab;
		currentConfig.calcOption.highLatitudeRule = calcOptHighLatRule;
		currentConfig.calcOption.adjustments.fajr = calcOptAdjustment_Fajr;
		currentConfig.calcOption.adjustments.sunrise = calcOptAdjustment_Sunrise;
		currentConfig.calcOption.adjustments.dhuhr = calcOptAdjustment_Dhuhr;
		currentConfig.calcOption.adjustments.asr = calcOptAdjustment_Asr;
		currentConfig.calcOption.adjustments.maghrib = calcOptAdjustment_Maghrib;
		currentConfig.calcOption.adjustments.isha = calcOptAdjustment_Isha;
		currentConfig.reminderOption.fajr.remindWhenOnTime = remind_fajr_remindWhenOnTime;
		currentConfig.reminderOption.fajr.earlyReminder = remind_fajr_earlyReminder;
		currentConfig.reminderOption.fajr.earlyTime = remind_fajr_earlyTime;
		currentConfig.reminderOption.fajr.intrusiveNotification = remind_fajr_intrusive;
		currentConfig.reminderOption.sunrise.remindWhenOnTime = remind_sunrise_remindWhenOnTime;
		currentConfig.reminderOption.sunrise.earlyReminder = remind_sunrise_earlyReminder;
		currentConfig.reminderOption.sunrise.earlyTime = remind_sunrise_earlyTime;
		currentConfig.reminderOption.sunrise.intrusiveNotification = remind_sunrise_intrusive;
		currentConfig.reminderOption.dhuhr.remindWhenOnTime = remind_dhuhr_remindWhenOnTime;
		currentConfig.reminderOption.dhuhr.earlyReminder = remind_dhuhr_earlyReminder;
		currentConfig.reminderOption.dhuhr.earlyTime = remind_dhuhr_earlyTime;
		currentConfig.reminderOption.dhuhr.intrusiveNotification = remind_dhuhr_intrusive;
		currentConfig.reminderOption.asr.remindWhenOnTime = remind_asr_remindWhenOnTime;
		currentConfig.reminderOption.asr.earlyReminder = remind_asr_earlyReminder;
		currentConfig.reminderOption.asr.earlyTime = remind_asr_earlyTime;
		currentConfig.reminderOption.asr.intrusiveNotification = remind_asr_intrusive;
		currentConfig.reminderOption.maghrib.remindWhenOnTime = remind_maghrib_remindWhenOnTime;
		currentConfig.reminderOption.maghrib.earlyReminder = remind_maghrib_earlyReminder;
		currentConfig.reminderOption.maghrib.earlyTime = remind_maghrib_earlyTime;
		currentConfig.reminderOption.maghrib.intrusiveNotification = remind_maghrib_intrusive;
		currentConfig.reminderOption.isha.remindWhenOnTime = remind_isha_remindWhenOnTime;
		currentConfig.reminderOption.isha.earlyReminder = remind_isha_earlyReminder;
		currentConfig.reminderOption.isha.earlyTime = remind_isha_earlyTime;
		currentConfig.reminderOption.isha.intrusiveNotification = remind_isha_intrusive;
		currentConfig.locationOption.mode = locMode;
		currentConfig.locationOption.city = locCity;
		currentConfig.locationOption.latitude = locLat;
		currentConfig.locationOption.longitude = locLang;
		currentConfig.locationOption.updateEveryStartup = locUpdateEveryStartup;
		currentConfig.timezoneOption.mode = tzMode;
		currentConfig.timezoneOption.timezone = timezone;
		currentConfig.geoLocAPIKey.mode = geolocMode;
		currentConfig.geoLocAPIKey.key = geolocKey;
		currentConfig.runAtStartup = runAtStartup;
		currentConfig.checkUpdateAtStartup = checkUpdateStartup;
		currentConfig.clockStyle = clockStyle;
		currentConfig.theme = appTheme;
		currentConfig.hijriCalendarOffset = hijriCalendarOffset;
		currentConfig.detectTimeChange = detectTimeChange;
	};

	// save config
	const saveTheConfig = () => {
		// update config
		storeConfig();
		// save config
		const result = window.electron.ipcRenderer.sendSync('save-config', currentConfig);

		if (result) {
			// if success
			// reset changed
			setChangesMade(false);
			// show snackbar
			setShowSnackbar(true);
			setSnackbarSeverity('success');
			setSnackbarMsg('Changes saved successfully.');
		} else {
			// show snackbar
			setShowSnackbar(true);
			setSnackbarSeverity('error');
			setSnackbarMsg('Error saving changes.');
		}
	};

	// --------------------------------------------------------------------------
	// check changes
	const checkChanges = () => {
		// comparing both configs seems to make weird bugs so we just make the changes true
		setChangesMade(true);
	};

	const openChangesMadeFunc = (arg: any) => {
		setCurrentDialog('changes');
		setDestination(arg as string);
		setDialogOpen(true);
	};

	// --------------------------------------------------------------------------
	useEffect(() => {
		// listener for page switching
		window.electron.ipcRenderer.on('open-changes-made', openChangesMadeFunc);

		return () => {
			window.electron.ipcRenderer.removeEventListener('open-changes-made', openChangesMadeFunc);
		};
	}, []);

	return (
		<>
			<CssBaseline />
			{/* -------------------------------------------------------------------------------------------------------------------------------------------- */}
			<Dialog open={dialogOpen} onClose={() => dialogMap[currentDialog][0]()} aria-labelledby='alert-dialog-title' aria-describedby='alert-dialog-description'>
				<DialogTitle id='alert-dialog-title'>{'Confirmation'}</DialogTitle>
				<DialogContent>
					<DialogContentText id='alert-dialog-description'>{dialogMap[currentDialog][1]}</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => dialogMap[currentDialog][0](true)}>Yes</Button>
					<Button onClick={() => dialogMap[currentDialog][0]()} autoFocus>
						No
					</Button>
				</DialogActions>
			</Dialog>
			{/* -------------------------------------------------------------------------------------------------------------------------------------------- */}
			<Snackbar anchorOrigin={{ vertical: 'top', horizontal: 'left' }} open={showSnackbar} autoHideDuration={3500} onClose={handleSnackbarClose}>
				<Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
					{snackbarMsg}
				</Alert>
			</Snackbar>
			{/* -------------------------------------------------------------------------------------------------------------------------------------------- */}
			<Fade in={true}>
				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
						width: '100%',
						color: 'text.primary',
						borderRadius: 1,
						p: 3,
					}}
				>
					{/* -------------------------------------------------------------------------------------------------------------------------------------------- */}
					{/* calc option, reminder */}
					<Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
						<Grid item xs={6}>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									flexWrap: 'wrap',
								}}
							>
								<CalculateOutlinedIcon color='primary' /> <h3 style={{ paddingLeft: '.5rem' }}>Prayer Times Calculation</h3>
							</div>
							<Box
								component={'form'}
								noValidate
								autoComplete='off'
								sx={{
									display: 'flex',
									flexDirection: 'column',
									'& .MuiTextField-root': { m: 1, ml: 0.5 },
								}}
							>
								<FormControl>
									<FormLabel id='location-mode-formlabel' sx={{ ml: 0.5 }}>
										Mode
									</FormLabel>
									<RadioGroup sx={{ ml: 0.5 }} row aria-labelledby='location-mode' name='row-radio-buttons-location-mode' value={calcOptMode} onChange={handleCalcOptModeChange}>
										<FormControlLabel value='default' control={<Radio />} label='Default' />
										<FormControlLabel value='manual' control={<Radio />} label='Manual' />
									</RadioGroup>

									<FormControl fullWidth sx={{ mt: 1, mb: 1 }}>
										<InputLabel id='calc-method'>Calculation Method</InputLabel>
										<Select
											labelId='calc-method'
											value={calcOptMethod}
											label='Calculation Method'
											onChange={(e) => handleCalcOptSelectChange(e as any, 'method')}
											disabled={calcOptMode === 'default' ? true : false}
										>
											{methodList.map((method) => (
												<MenuItem key={method} value={method}>
													{method}
												</MenuItem>
											))}
										</Select>
									</FormControl>

									<FormControl fullWidth sx={{ mt: 1, mb: 1 }}>
										<InputLabel id='madhab-select'>Madhab</InputLabel>
										<Select
											labelId='madhab-select'
											value={calcOptMadhab}
											label='Madhab'
											onChange={(e) => handleCalcOptSelectChange(e as any, 'madhab')}
											disabled={calcOptMode === 'default' ? true : false}
										>
											{madhabList.map((method) => (
												<MenuItem key={method} value={method}>
													{method}
												</MenuItem>
											))}
										</Select>
									</FormControl>

									<FormControl fullWidth sx={{ mt: 1, mb: 1 }}>
										<InputLabel id='highlat-select'>High Latitude Adjustment</InputLabel>
										<Select
											labelId='highlat-select'
											value={calcOptHighLatRule}
											label='High Latitude Adjustment'
											onChange={(e) => handleCalcOptSelectChange(e as any, 'highLatitudeRule')}
											disabled={calcOptMode === 'default' ? true : false}
										>
											{highLatRuleList.map((method) => (
												<MenuItem key={method} value={method}>
													{method}
												</MenuItem>
											))}
										</Select>
									</FormControl>

									<FormLabel id='prayer-adjustment' sx={{ ml: 0.5 }}>
										Prayer Time Adjustment
									</FormLabel>
									<Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'start', '& .MuiFormControl-root': { mr: 2.5 } }}>
										<FormControl>
											<FormLabel id='fajr-adjustment' sx={{ ml: 0.5 }}>
												Fajr
											</FormLabel>
											<MuiInput
												style={{ marginTop: '4px' }}
												sx={{ ml: 0.5 }}
												value={calcOptAdjustment_Fajr}
												onChange={(e) => handleCalcOptAdjustmentChange(e as any, 'fajr')}
												onBlur={() => handleBlurCalcOptAdjustmentChange('fajr')}
												inputProps={{
													step: 1,
													min: -300,
													max: 300,
													type: 'number',
													'aria-labelledby': 'input-slider',
												}}
											/>
										</FormControl>

										<FormControl>
											<FormLabel id='sunrise-adjustment'>Sunrise</FormLabel>
											<MuiInput
												style={{ marginTop: '4px' }}
												value={calcOptAdjustment_Sunrise}
												onChange={(e) => handleCalcOptAdjustmentChange(e as any, 'sunrise')}
												onBlur={() => handleBlurCalcOptAdjustmentChange('sunrise')}
												inputProps={{
													step: 1,
													min: -300,
													max: 300,
													type: 'number',
													'aria-labelledby': 'input-slider',
												}}
											/>
										</FormControl>

										<FormControl>
											<FormLabel id='dhuhr-adjustment'>Dhuhr</FormLabel>
											<MuiInput
												style={{ marginTop: '4px' }}
												value={calcOptAdjustment_Dhuhr}
												onChange={(e) => handleCalcOptAdjustmentChange(e as any, 'dhuhr')}
												onBlur={() => handleBlurCalcOptAdjustmentChange('dhuhr')}
												inputProps={{
													step: 1,
													min: -300,
													max: 300,
													type: 'number',
													'aria-labelledby': 'input-slider',
												}}
											/>
										</FormControl>

										<FormControl>
											<FormLabel id='asr-adjustment'>Asr</FormLabel>
											<MuiInput
												style={{ marginTop: '4px' }}
												value={calcOptAdjustment_Asr}
												onChange={(e) => handleCalcOptAdjustmentChange(e as any, 'asr')}
												onBlur={() => handleBlurCalcOptAdjustmentChange('asr')}
												inputProps={{
													step: 1,
													min: -300,
													max: 300,
													type: 'number',
													'aria-labelledby': 'input-slider',
												}}
											/>
										</FormControl>

										<FormControl>
											<FormLabel id='maghrib-adjustment'>Magrib</FormLabel>
											<MuiInput
												style={{ marginTop: '4px' }}
												value={calcOptAdjustment_Maghrib}
												onChange={(e) => handleCalcOptAdjustmentChange(e as any, 'maghrib')}
												onBlur={() => handleBlurCalcOptAdjustmentChange('maghrib')}
												inputProps={{
													step: 1,
													min: -300,
													max: 300,
													type: 'number',
													'aria-labelledby': 'input-slider',
												}}
											/>
										</FormControl>

										<FormControl>
											<FormLabel id='isha-adjustment'>Isha</FormLabel>
											<MuiInput
												style={{ marginTop: '4px' }}
												value={calcOptAdjustment_Isha}
												onChange={(e) => handleCalcOptAdjustmentChange(e as any, 'isha')}
												onBlur={() => handleBlurCalcOptAdjustmentChange('isha')}
												inputProps={{
													step: 1,
													min: -300,
													max: 300,
													type: 'number',
													'aria-labelledby': 'input-slider',
												}}
											/>
										</FormControl>
									</Box>
								</FormControl>
							</Box>
						</Grid>

						<Grid item xs={6}>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									flexWrap: 'wrap',
								}}
							>
								<TimerOutlinedIcon color='primary' /> <h3 style={{ paddingLeft: '.5rem' }}>Reminder Options</h3>
							</div>
							<Box
								component={'form'}
								noValidate
								autoComplete='off'
								sx={{
									display: 'flex',
									flexDirection: 'row',
									'& .MuiTextField-root': { m: 1, ml: 0.5 },
								}}
							>
								<Box
									sx={{
										display: 'flex',
										flexDirection: 'column',
										'& .MuiFormControl-root': { mr: 2.5 },
									}}
								>
									<FormLabel id='reminder-time-fajr'>Minutes Before</FormLabel>
									<Box
										sx={{
											display: 'flex',
											flexDirection: 'row',
										}}
									>
										<FormControl>
											<FormLabel id='reminder-time-fajr'>Fajr</FormLabel>
											<MuiInput
												style={{ marginTop: '4px' }}
												value={remind_fajr_earlyTime}
												onChange={(e) => handleEarlyTimeChange(e as any, 'fajr')}
												onBlur={() => blurEarlyTime('fajr')}
												inputProps={{
													step: 1,
													min: 1,
													max: 60,
													type: 'number',
													'aria-labelledby': 'input-slider',
												}}
											/>
										</FormControl>

										<FormControl>
											<FormLabel id='reminder-time-sunrise'>Sunrise</FormLabel>
											<MuiInput
												style={{ marginTop: '4px' }}
												value={remind_sunrise_earlyTime}
												onChange={(e) => handleEarlyTimeChange(e as any, 'sunrise')}
												onBlur={() => blurEarlyTime('sunrise')}
												inputProps={{
													step: 1,
													min: 1,
													max: 60,
													type: 'number',
													'aria-labelledby': 'input-slider',
												}}
											/>
										</FormControl>

										<FormControl>
											<FormLabel id='reminder-time-dhuhr'>Dhuhr</FormLabel>
											<MuiInput
												style={{ marginTop: '4px' }}
												value={remind_dhuhr_earlyTime}
												onChange={(e) => handleEarlyTimeChange(e as any, 'dhuhr')}
												onBlur={() => blurEarlyTime('dhuhr')}
												inputProps={{
													step: 1,
													min: 1,
													max: 60,
													type: 'number',
													'aria-labelledby': 'input-slider',
												}}
											/>
										</FormControl>

										<FormControl>
											<FormLabel id='reminder-time-asr'>Asr</FormLabel>
											<MuiInput
												style={{ marginTop: '4px' }}
												value={remind_asr_earlyTime}
												onChange={(e) => handleEarlyTimeChange(e as any, 'asr')}
												onBlur={() => blurEarlyTime('asr')}
												inputProps={{
													step: 1,
													min: 1,
													max: 60,
													type: 'number',
													'aria-labelledby': 'input-slider',
												}}
											/>
										</FormControl>

										<FormControl>
											<FormLabel id='reminder-time-maghrib'>Maghrib</FormLabel>
											<MuiInput
												style={{ marginTop: '4px' }}
												value={remind_maghrib_earlyTime}
												onChange={(e) => handleEarlyTimeChange(e as any, 'maghrib')}
												onBlur={() => blurEarlyTime('maghrib')}
												inputProps={{
													step: 1,
													min: 1,
													max: 60,
													type: 'number',
													'aria-labelledby': 'input-slider',
												}}
											/>
										</FormControl>

										<FormControl>
											<FormLabel id='reminder-time-isha'>Isha</FormLabel>
											<MuiInput
												style={{ marginTop: '4px' }}
												value={remind_isha_earlyTime}
												onChange={(e) => handleEarlyTimeChange(e as any, 'isha')}
												onBlur={() => blurEarlyTime('isha')}
												inputProps={{
													step: 1,
													min: 1,
													max: 60,
													type: 'number',
													'aria-labelledby': 'input-slider',
												}}
											/>
										</FormControl>
									</Box>

									<Box
										sx={{
											display: 'flex',
										}}
									>
										<FormControl sx={{ mt: 2 }} component='fieldset' variant='standard'>
											<FormLabel component='legend'>Remind When On Time</FormLabel>
											<FormGroup>
												<FormControlLabel control={<Checkbox checked={remind_fajr_remindWhenOnTime} onChange={(e) => handleRemindWhenOnTimeChange(e as any, 'fajr')} />} label='Fajr' />
												<FormControlLabel
													control={<Checkbox checked={remind_sunrise_remindWhenOnTime} onChange={(e) => handleRemindWhenOnTimeChange(e as any, 'sunrise')} />}
													label='Sunrise'
												/>
												<FormControlLabel control={<Checkbox checked={remind_dhuhr_remindWhenOnTime} onChange={(e) => handleRemindWhenOnTimeChange(e as any, 'dhuhr')} />} label='Dhuhr' />
												<FormControlLabel control={<Checkbox checked={remind_asr_remindWhenOnTime} onChange={(e) => handleRemindWhenOnTimeChange(e as any, 'asr')} />} label='Asr' />
												<FormControlLabel
													control={<Checkbox checked={remind_maghrib_remindWhenOnTime} onChange={(e) => handleRemindWhenOnTimeChange(e as any, 'maghrib')} />}
													label='Maghrib'
												/>
												<FormControlLabel control={<Checkbox checked={remind_isha_remindWhenOnTime} onChange={(e) => handleRemindWhenOnTimeChange(e as any, 'isha')} />} label='Isha' />
											</FormGroup>
										</FormControl>

										<FormControl sx={{ mt: 2, ml: 3 }} component='fieldset' variant='standard'>
											<FormLabel component='legend'>Early Reminder</FormLabel>
											<FormGroup>
												<FormControlLabel control={<Checkbox checked={remind_fajr_earlyReminder} onChange={(e) => handleEarlyReminderChange(e as any, 'fajr')} />} label='Fajr' />
												<FormControlLabel control={<Checkbox checked={remind_sunrise_earlyReminder} onChange={(e) => handleEarlyReminderChange(e as any, 'sunrise')} />} label='Sunrise' />
												<FormControlLabel control={<Checkbox checked={remind_dhuhr_earlyReminder} onChange={(e) => handleEarlyReminderChange(e as any, 'dhuhr')} />} label='Dhuhr' />
												<FormControlLabel control={<Checkbox checked={remind_asr_earlyReminder} onChange={(e) => handleEarlyReminderChange(e as any, 'asr')} />} label='Asr' />
												<FormControlLabel control={<Checkbox checked={remind_maghrib_earlyReminder} onChange={(e) => handleEarlyReminderChange(e as any, 'maghrib')} />} label='Maghrib' />
												<FormControlLabel control={<Checkbox checked={remind_isha_earlyReminder} onChange={(e) => handleEarlyReminderChange(e as any, 'isha')} />} label='Isha' />
											</FormGroup>
										</FormControl>

										<FormControl sx={{ mt: 2, ml: 3 }} component='fieldset' variant='standard'>
											<Tooltip title='Will show up reminder as a interruptive message box' placement='top' arrow>
												<FormLabel component='legend'>Popup notification</FormLabel>
											</Tooltip>
											<FormGroup>
												<FormControlLabel control={<Checkbox checked={remind_fajr_intrusive} onChange={(e) => handleIntrusiveChange(e as any, 'fajr')} />} label='Fajr' />
												<FormControlLabel control={<Checkbox checked={remind_sunrise_intrusive} onChange={(e) => handleIntrusiveChange(e as any, 'sunrise')} />} label='Sunrise' />
												<FormControlLabel control={<Checkbox checked={remind_dhuhr_intrusive} onChange={(e) => handleIntrusiveChange(e as any, 'dhuhr')} />} label='Dhuhr' />
												<FormControlLabel control={<Checkbox checked={remind_asr_intrusive} onChange={(e) => handleIntrusiveChange(e as any, 'asr')} />} label='Asr' />
												<FormControlLabel control={<Checkbox checked={remind_maghrib_intrusive} onChange={(e) => handleIntrusiveChange(e as any, 'maghrib')} />} label='Maghrib' />
												<FormControlLabel control={<Checkbox checked={remind_isha_intrusive} onChange={(e) => handleIntrusiveChange(e as any, 'isha')} />} label='Isha' />
											</FormGroup>
										</FormControl>
									</Box>
								</Box>
							</Box>
						</Grid>
					</Grid>
					{/* -------------------------------------------------------------------------------------------------------------------------------------------- */}
					{/* location, timezone, api keys */}
					<Divider sx={{ mt: 2, mb: 2 }} />
					<Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
						{/* ------------------------------------- */}
						{/* Timezone & API Keys */}
						<Grid item xs={6}>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									flexWrap: 'wrap',
								}}
							>
								<AccessTimeOutlinedIcon color='primary' /> <h3 style={{ paddingLeft: '.5rem' }}>Timezone options</h3>
							</div>
							<Box
								component={'form'}
								noValidate
								autoComplete='off'
								sx={{
									display: 'flex',
									flexDirection: 'column',
									'& .MuiTextField-root': { m: 1, ml: 0.5 },
								}}
							>
								<FormControl>
									<FormLabel id='location-mode-formlabel' sx={{ ml: 0.5 }}>
										Mode
									</FormLabel>
									<RadioGroup sx={{ ml: 0.5 }} row aria-labelledby='location-mode' name='row-radio-buttons-location-mode' value={tzMode} onChange={handleTzModeChange}>
										<FormControlLabel value='auto' control={<Radio />} label='Auto' />
										<FormControlLabel value='manual' control={<Radio />} label='Manual' />
									</RadioGroup>
									<FormControl>
										<Autocomplete
											size='small'
											id='select-timezone-select'
											options={tzList}
											value={timezone}
											onChange={handleTimezoneChange}
											inputValue={tzInput}
											onInputChange={handleTzInputChange}
											renderInput={(params) => <TextField {...params} label='Timezone' />}
											disabled={tzMode === 'auto' ? true : false}
											autoHighlight
											sx={{
												width: '98.5%',
											}}
										/>
									</FormControl>
								</FormControl>
							</Box>

							<Divider sx={{ pt: 2 }} />
							{/* api keys */}
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									flexWrap: 'wrap',
								}}
							>
								<KeyIcon color='primary' /> <h3 style={{ paddingLeft: '.5rem' }}>API Key</h3>
							</div>
							<Box
								component={'form'}
								noValidate
								autoComplete='off'
								sx={{
									display: 'flex',
									flexDirection: 'column',
									'& .MuiTextField-root': { m: 1, ml: 0.5 },
								}}
							>
								<FormControl>
									<FormLabel id='location-mode-formlabel' sx={{ ml: 0.5 }}>
										Mode
									</FormLabel>
									<RadioGroup sx={{ ml: 0.5 }} row aria-labelledby='location-mode' name='row-radio-buttons-location-mode' value={geolocMode} onChange={handleGeolocModeChange}>
										<FormControlLabel value='auto' control={<Radio />} label='Auto' />
										<FormControlLabel value='manual' control={<Radio />} label='Manual' />
									</RadioGroup>

									<TextField
										id='freegeoip'
										label='Freegeoip.app API Key'
										variant='outlined'
										size='small'
										value={geolocKey}
										onChange={handleGeolocKeyChange}
										disabled={geolocMode === 'auto' ? true : false}
										InputProps={{
											endAdornment: (
												<Tooltip title='Click to verify API key inputted' placement='top' arrow>
													<InputAdornment position='end'>
														<IconButton aria-label="Get inputted city's lattitude/langitude" onClick={verifyKey} edge='end' disabled={geolocMode === 'auto' ? true : false}>
															<SearchIcon />
														</IconButton>
													</InputAdornment>
												</Tooltip>
											),
										}}
									/>
								</FormControl>
							</Box>
						</Grid>
						{/* ------------------------------------- */}
						{/* location */}
						<Grid item xs={6}>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									flexWrap: 'wrap',
								}}
							>
								<LocationOnOutlinedIcon color='primary' /> <h3 style={{ paddingLeft: '.5rem' }}>Location options</h3>
							</div>
							<Box
								component={'form'}
								noValidate
								autoComplete='off'
								sx={{
									display: 'flex',
									flexDirection: 'column',
									'& .MuiTextField-root': { m: 1, ml: 0.5 },
								}}
							>
								<FormControl>
									<FormLabel id='location-mode-formlabel' sx={{ ml: 0.5 }}>
										Mode
									</FormLabel>
									<RadioGroup sx={{ ml: 0.5 }} row aria-labelledby='location-mode' name='row-radio-buttons-location-mode' value={locMode} onChange={handleLocModeChange}>
										<FormControlLabel value='auto' control={<Radio />} label='Auto' />
										<FormControlLabel value='manual' control={<Radio />} label='Manual' />
										<Tooltip title='Click to sync location automatically' arrow>
											<IconButton aria-label='delete' disabled={locMode === 'manual' ? true : false} onClick={getCityLatLang_Auto}>
												<SyncIcon />
											</IconButton>
										</Tooltip>
									</RadioGroup>

									<TextField
										id='city'
										label='City'
										variant='outlined'
										size='small'
										value={locCity}
										onChange={handleCityChange}
										disabled={locMode === 'auto' ? true : false}
										InputProps={{
											endAdornment: (
												<Tooltip title="Click to search for inputted city's latitude/langitude" placement='top' arrow>
													<InputAdornment position='end'>
														<IconButton aria-label="Get inputted city's lattitude/langitude" onClick={getCityLatLang_Manual} edge='end' disabled={locMode === 'auto' ? true : false}>
															<SearchIcon />
														</IconButton>
													</InputAdornment>
												</Tooltip>
											),
										}}
									/>
									<TextField id='Latitude' label='latitude' variant='outlined' size='small' value={locLat} onChange={handleLatChange} disabled={locMode === 'auto' ? true : false} />
									<TextField id='Longitude' label='longitude' variant='outlined' size='small' value={locLang} onChange={handleLangChange} disabled={locMode === 'auto' ? true : false} />
									<Tooltip title='*Will only update if auto mode is enabled' arrow>
										<FormControlLabel
											control={<Checkbox sx={{ ml: 0.5 }} checked={locUpdateEveryStartup} onChange={handleLocUpdateEveryStartupChange} disabled={locMode === 'auto' ? false : true} />}
											label='Update location on app start'
										/>
									</Tooltip>
								</FormControl>
							</Box>
						</Grid>
					</Grid>
					{/* -------------------------------------------------------------------------------------------------------------------------------------------- */}
					{/* other settings */}
					<Divider sx={{ mt: 2, mb: 2 }} />
					<Grid container spacing={2}>
						<Grid item xs={12}>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									flexWrap: 'wrap',
								}}
							>
								<MiscellaneousServicesOutlinedIcon color='primary' /> <h3 style={{ paddingLeft: '.5rem' }}>Other Settings</h3>
							</div>
							<Box
								component={'form'}
								noValidate
								autoComplete='off'
								sx={{
									display: 'flex',
									flexDirection: 'row',
								}}
							>
								<FormControl sx={{ mr: 2 }}>
									<FormLabel sx={{ ml: 0.5 }}>Theme</FormLabel>
									<RadioGroup sx={{ ml: 0.5 }} row aria-labelledby='app-theme' name='row-radio-buttons-app-theme' value={appTheme} onChange={handleColorModeChange}>
										<FormControlLabel value='light' control={<Radio />} label='Light' />
										<FormControlLabel value='dark' control={<Radio />} label='Dark' />
									</RadioGroup>
								</FormControl>

								<FormControl sx={{ mr: 4 }}>
									<Tooltip title='*In days' placement='top' arrow>
										<FormLabel sx={{ ml: 0.5 }}>Hijri Calendar Offset</FormLabel>
									</Tooltip>
									<MuiInput
										style={{ marginTop: '4px' }}
										sx={{ ml: 0.5 }}
										value={hijriCalendarOffset}
										onChange={handleHijriCalendarOffsetChange}
										onBlur={handleBlurHijriCalendarOffset}
										inputProps={{
											step: 1,
											min: -5,
											max: 5,
											type: 'number',
										}}
									/>
								</FormControl>

								<FormControl>
									<FormLabel>Startup Options</FormLabel>
									<Box
										sx={{
											display: 'flex',
											flexDirection: 'row',
										}}
									>
										<FormControlLabel control={<Checkbox checked={runAtStartup} onChange={handleRunAtStartupChange} />} label='Run app on PC startup' />
										<FormControlLabel control={<Checkbox checked={checkUpdateStartup} onChange={handleCheckUpdateStartupChange} />} label='Check for update on app start' />
									</Box>
								</FormControl>

								<FormControl sx={{ minWidth: '120px', mr: 2 }}>
									<FormLabel>Clock Style</FormLabel>
									<Select size='small' value={clockStyle} onChange={handleClockStyleChange}>
										<MenuItem value='AM/PM'>AM/PM</MenuItem>
										<MenuItem value='24h'>24h</MenuItem>
									</Select>
								</FormControl>

								<FormControl>
									<FormLabel>Time sync</FormLabel>
									<Box
										sx={{
											display: 'flex',
											flexDirection: 'row',
										}}
									>
										<Tooltip title='The app will check every 30 seconds for local time changes. Recommended to turn off if you are not messing arround with the local time/clock of your PC'>
											<FormControlLabel control={<Checkbox checked={detectTimeChange} onChange={handleDetectTimeChange} />} label='Detect local time change' />
										</Tooltip>
									</Box>
								</FormControl>
							</Box>
						</Grid>
					</Grid>

					{/* -------------------------------------------------------------------------------------------------------------------------------------------- */}
					<Divider sx={{ mt: 6, width: '200px', ml: 'auto', mr: 'auto' }} />
					<Box sx={{ '& button': { m: 1 }, display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', mt: 0.25 }}>
						{/* Cancel changes */}
						<Button
							variant='outlined'
							onClick={() => {
								setCurrentDialog('cancel');
								setDialogOpen(true);
							}}
							size='small'
						>
							<SettingsBackupRestoreIcon fontSize='small' /> Cancel
						</Button>
						<Button
							variant='contained'
							onClick={() => {
								setCurrentDialog('save');
								setDialogOpen(true);
							}}
							size='small'
						>
							<SaveIcon fontSize='small' /> Save
						</Button>
					</Box>
				</Box>
			</Fade>
		</>
	);
};
