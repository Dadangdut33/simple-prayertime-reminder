import { ColorModeContextInterface } from 'renderer/interfaces';
import { configInterface, getPosition_absolute_I, calcMethod, madhab, highLatitudeRule_T, prayerTimes } from 'main/interfaces';
import { useContext, forwardRef, useState, ChangeEvent, useEffect } from 'react';

// Audio player
// @ts-ignore
import ReactHowler from 'react-howler';

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
import CircularProgress from '@mui/material/CircularProgress';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

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
import Select, { SelectChangeEvent } from '@mui/material/Select';
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
import MiscellaneousServicesOutlinedIcon from '@mui/icons-material/MiscellaneousServicesOutlined';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

export const Settings = ({ appTheme, ColorModeContext, setChangesMade }: any) => {
	// helper
	const sleep = (time: number) => {
		return new Promise((resolve) => setTimeout(resolve, time));
	};

	// config on tab open
	const initialConfig = window.electron.ipcRenderer.sendSync('get-config') as configInterface;
	const [currentConfig, setCurrentConfig] = useState<configInterface>(initialConfig); // current config
	const [destination, setDestination] = useState<string>(''); // destination path

	// --------------------------------------------------------------------------
	// calcOption
	const [calcOptMode, setCalcOptMode] = useState<'default' | 'manual'>('default');
	const [calcOptMethod, setCalcOptMethod] = useState<calcMethod>('MuslimWorldLeague');
	const [calcOptMadhab, setCalcOptMadhab] = useState<madhab>('Shafi');
	const [calcOptHighLatRule, setCalcOptHighLatRule] = useState<highLatitudeRule_T>('MiddleOfTheNight');
	const [calcOptAdjustment_Fajr, setCalcOptAdjustment_Fajr] = useState<number>(0);
	const [calcOptAdjustment_Sunrise, setCalcOptAdjustment_Sunrise] = useState<number>(0);
	const [calcOptAdjustment_Dhuhr, setCalcOptAdjustment_Dhuhr] = useState<number>(0);
	const [calcOptAdjustment_Asr, setCalcOptAdjustment_Asr] = useState<number>(0);
	const [calcOptAdjustment_Maghrib, setCalcOptAdjustment_Maghrib] = useState<number>(0);
	const [calcOptAdjustment_Isha, setCalcOptAdjustment_Isha] = useState<number>(0);

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
	const [rm_fjr_bool_ontime, setFjr_bool_ontime] = useState<boolean>(true);
	const [rm_fjr_bool_before, setFjr_bool_before] = useState<boolean>(true);
	const [rm_fjr_bool_after, setFjr_bool_after] = useState<boolean>(true);
	const [rm_fjr_bool_adhan, setFjr_bool_adhan] = useState<boolean>(true);
	const [rm_fjr_bool_popup, setFjr_bool_popup] = useState<boolean>(true);
	const [rm_fjr_number_before, setFjr_number_before] = useState<number>(15);
	const [rm_fjr_number_after, setFjr_number_after] = useState<number>(15);

	const [rm_snr_bool_ontime, setSnr_bool_ontime] = useState<boolean>(true);
	const [rm_snr_bool_before, setSnr_bool_before] = useState<boolean>(true);
	const [rm_snr_bool_after, setSnr_bool_after] = useState<boolean>(true);
	const [rm_snr_bool_popup, setSnr_bool_popup] = useState<boolean>(true);
	const [rm_snr_number_before, setSnr_number_before] = useState<number>(15);
	const [rm_snr_number_after, setSnr_number_after] = useState<number>(15);

	const [rm_dhr_bool_ontime, setDhr_bool_ontime] = useState<boolean>(true);
	const [rm_dhr_bool_before, setDhr_bool_before] = useState<boolean>(true);
	const [rm_dhr_bool_after, setDhr_bool_after] = useState<boolean>(true);
	const [rm_dhr_bool_adhan, setDhr_bool_adhan] = useState<boolean>(true);
	const [rm_dhr_bool_popup, setDhr_bool_popup] = useState<boolean>(true);
	const [rm_dhr_number_before, setDhr_number_before] = useState<number>(15);
	const [rm_dhr_number_after, setDhr_number_after] = useState<number>(15);

	const [rm_asr_bool_ontime, setAsr_bool_ontime] = useState<boolean>(true);
	const [rm_asr_bool_before, setAsr_bool_before] = useState<boolean>(true);
	const [rm_asr_bool_after, setAsr_bool_after] = useState<boolean>(true);
	const [rm_asr_bool_adhan, setAsr_bool_adhan] = useState<boolean>(true);
	const [rm_asr_bool_popup, setAsr_bool_popup] = useState<boolean>(true);
	const [rm_asr_number_before, setAsr_number_before] = useState<number>(15);
	const [rm_asr_number_after, setAsr_number_after] = useState<number>(15);

	const [rm_mgr_bool_ontime, setMgr_bool_ontime] = useState<boolean>(true);
	const [rm_mgr_bool_before, setMgr_bool_before] = useState<boolean>(true);
	const [rm_mgr_bool_after, setMgr_bool_after] = useState<boolean>(true);
	const [rm_mgr_bool_adhan, setMgr_bool_adhan] = useState<boolean>(true);
	const [rm_mgr_bool_popup, setMgr_bool_popup] = useState<boolean>(true);
	const [rm_mgr_number_before, setMgr_number_before] = useState<number>(15);
	const [rm_mgr_number_after, setMgr_number_after] = useState<number>(15);

	const [rm_isha_bool_ontime, setIsha_bool_ontime] = useState<boolean>(true);
	const [rm_isha_bool_before, setIsha_bool_before] = useState<boolean>(true);
	const [rm_isha_bool_after, setIsha_bool_after] = useState<boolean>(true);
	const [rm_isha_bool_adhan, setIsha_bool_adhan] = useState<boolean>(true);
	const [rm_isha_bool_popup, setIsha_bool_popup] = useState<boolean>(true);
	const [rm_isha_number_before, setIsha_number_before] = useState<number>(15);
	const [rm_isha_number_after, setIsha_number_after] = useState<number>(15);

	const bool_rmOnTimeMap: any = {
		1: setFjr_bool_ontime,
		2: setSnr_bool_ontime,
		3: setDhr_bool_ontime,
		4: setAsr_bool_ontime,
		5: setMgr_bool_ontime,
		6: setIsha_bool_ontime,
	};

	const bool_rmBeforeMap: any = {
		1: setFjr_bool_before,
		2: setSnr_bool_before,
		3: setDhr_bool_before,
		4: setAsr_bool_before,
		5: setMgr_bool_before,
		6: setIsha_bool_before,
	};

	const bool_rmAfterMap: any = {
		1: setFjr_bool_after,
		2: setSnr_bool_after,
		3: setDhr_bool_after,
		4: setAsr_bool_after,
		5: setMgr_bool_after,
		6: setIsha_bool_after,
	};

	const bool_rmAdhanMap: any = {
		1: setFjr_bool_adhan,
		3: setDhr_bool_adhan,
		4: setAsr_bool_adhan,
		5: setMgr_bool_adhan,
		6: setIsha_bool_adhan,
	};

	const bool_rmPopupMap: any = {
		1: setFjr_bool_popup,
		2: setSnr_bool_popup,
		3: setDhr_bool_popup,
		4: setAsr_bool_popup,
		5: setMgr_bool_popup,
		6: setIsha_bool_popup,
	};

	const time_rmBeforeMap: any = {
		1: setFjr_number_before,
		2: setSnr_number_before,
		3: setDhr_number_before,
		4: setAsr_number_before,
		5: setMgr_number_before,
		6: setIsha_number_before,
	};

	const time_rmAfterMap: any = {
		1: setFjr_number_after,
		2: setSnr_number_after,
		3: setDhr_number_after,
		4: setAsr_number_after,
		5: setMgr_number_after,
		6: setIsha_number_after,
	};

	const reminderGridColumns: GridColDef[] = [
		{ field: 'type', headerName: 'Type', editable: false, hideable: false, sortable: false, description: 'Prayer Types' },
		{
			field: 'minute_before',
			headerName: 'Minute Before',
			type: 'number',
			width: 110,
			editable: true,
			hideable: false,
			sortable: false,
			description: 'Minutes for reminder before for each prayer times (Range from 0-60)',
			valueParser: (value, params) => {
				if (value === '' || value === null || value < 0) {
					time_rmBeforeMap[params!.id](0);
					return 0;
				} else if (value > 60) {
					time_rmBeforeMap[params!.id](60);
					return 60;
				} else {
					time_rmBeforeMap[params!.id](value);
					return value;
				}
			},
		},
		{
			field: 'minute_after',
			headerName: 'Minute After',
			type: 'number',
			width: 100,
			editable: true,
			hideable: false,
			sortable: false,
			description: 'Minutes for reminder after each prayer times (Range from 0-60)',
			valueParser: (value, params) => {
				if (value === '' || value === null || value < 0) {
					time_rmAfterMap[params!.id](0);
					return 0;
				} else if (value > 60) {
					time_rmAfterMap[params!.id](60);
					return 60;
				} else {
					time_rmAfterMap[params!.id](value);
					return value;
				}
			},
		},
		{
			field: 'reminder_before',
			headerName: 'Reminder Before',
			type: 'boolean',
			width: 125,
			editable: true,
			hideable: false,
			sortable: false,
			description: "Enable or disable each prayer's early reminder (reminder before the praytime)",
			valueParser: (value, params) => {
				bool_rmBeforeMap[params!.id.valueOf()](value as boolean);
				return value;
			},
		},
		{
			field: 'reminder_after',
			headerName: 'Reminder After',
			type: 'boolean',
			width: 120,
			editable: true,
			hideable: false,
			sortable: false,
			description: "Enable or disable each prayer's after reminder (reminder after the praytime)",
			valueParser: (value, params) => {
				bool_rmAfterMap[params!.id.valueOf()](value as boolean);
				return value;
			},
		},
		{
			field: 'reminder_ontime',
			headerName: 'Reminder On Time',
			type: 'boolean',
			width: 140,
			editable: true,
			hideable: false,
			sortable: false,
			description: "Enable or disable each prayer's on time reminder (reminder when it's prayertime)",
			valueParser: (value, params) => {
				bool_rmOnTimeMap[params!.id.valueOf()](value as boolean);
				return value;
			},
		},
		{
			field: 'adhan',
			headerName: 'Adhan',
			type: 'boolean',
			width: 75,
			editable: true,
			hideable: false,
			sortable: false,
			description: "Enable or disable adhan for each prayer when it's prayertime. (Adhan will not play on sunrise)",
			valueParser: (value, params) => {
				if (params!.id === 2) {
					return false;
				} else {
					bool_rmAdhanMap[params!.id.valueOf()](value as boolean);
					return value;
				}
			},
		},
		{
			field: 'popup',
			headerName: 'Popup',
			type: 'boolean',
			width: 75,
			editable: true,
			hideable: false,
			sortable: false,
			description: 'Enable or disable messagebox popup for each reminder',
			valueParser: (value, params) => {
				bool_rmPopupMap[params!.id.valueOf()](value as boolean);
				return value;
			},
		},
	];

	const reminderGridRowsProp = [
		{
			id: 1,
			type: 'Fajr',
			minute_before: rm_fjr_number_before,
			minute_after: rm_fjr_number_after,
			reminder_before: rm_fjr_bool_before,
			reminder_after: rm_fjr_bool_after,
			reminder_ontime: rm_fjr_bool_ontime,
			adhan: rm_fjr_bool_adhan,
			popup: rm_fjr_bool_popup,
		},
		{
			id: 2,
			type: 'Sunrise',
			minute_before: rm_snr_number_before,
			minute_after: rm_snr_number_after,
			reminder_before: rm_snr_bool_before,
			reminder_after: rm_snr_bool_after,
			reminder_ontime: rm_snr_bool_ontime,
			popup: rm_snr_bool_popup,
		},
		{
			id: 3,
			type: 'Dhuhr',
			minute_before: rm_dhr_number_before,
			minute_after: rm_dhr_number_after,
			reminder_before: rm_dhr_bool_before,
			reminder_after: rm_dhr_bool_after,
			reminder_ontime: rm_dhr_bool_ontime,
			adhan: rm_dhr_bool_adhan,
			popup: rm_dhr_bool_popup,
		},
		{
			id: 4,
			type: 'Asr',
			minute_before: rm_asr_number_before,
			minute_after: rm_asr_number_after,
			reminder_before: rm_asr_bool_before,
			reminder_after: rm_asr_bool_after,
			reminder_ontime: rm_asr_bool_ontime,
			adhan: rm_asr_bool_adhan,
			popup: rm_asr_bool_popup,
		},
		{
			id: 5,
			type: 'Maghrib',
			minute_before: rm_mgr_number_before,
			minute_after: rm_mgr_number_after,
			reminder_before: rm_mgr_bool_before,
			reminder_after: rm_mgr_bool_after,
			reminder_ontime: rm_mgr_bool_ontime,
			adhan: rm_mgr_bool_adhan,
			popup: rm_mgr_bool_popup,
		},
		{
			id: 6,
			type: 'Isha',
			minute_before: rm_isha_number_before,
			minute_after: rm_isha_number_after,
			reminder_before: rm_isha_bool_before,
			reminder_after: rm_isha_bool_after,
			reminder_ontime: rm_isha_bool_ontime,
			adhan: rm_isha_bool_adhan,
			popup: rm_isha_bool_popup,
		},
	];

	// --------------------------------------------------------------------------
	// adhanPath
	const [adhanInput, setAdhanInput] = useState(initialConfig.adhanSoundPath.fajr === 'auto' ? (window.electron.ipcRenderer.sendSync('get-default-adhan-fajr') as string) : initialConfig.adhanSoundPath.fajr);
	const [adhanFajr, setAdhanFajr] = useState('');
	const [adhanNormal, setAdhanNormal] = useState('');
	const [selectAdhan, setSelectAdhan] = useState('Fajr');
	const [adhanPlaying, setAdhanPlaying] = useState(false);
	const [adhanPlayer, setAdhanPlayer] = useState<any>(null);

	const handleSelectAdhan = (e: SelectChangeEvent) => {
		// stop player and set not playing
		if (adhanPlayer) adhanPlayer.stop();
		setAdhanPlaying(false);

		setSelectAdhan(e.target.value);
		setAdhanInput(
			e.target.value === 'Fajr'
				? adhanFajr === 'auto'
					? (window.electron.ipcRenderer.sendSync('get-default-adhan-fajr') as string)
					: adhanFajr
				: adhanNormal === 'auto'
				? (window.electron.ipcRenderer.sendSync('get-default-adhan-normal') as string)
				: adhanNormal
		);
	};

	const handleAdhanInput = () => {
		// stop player and set not playing
		if (adhanPlayer) adhanPlayer.stop();
		setAdhanPlaying(false);

		// open dialog get input
		const dialog: any = window.electron.ipcRenderer.sendSync('file-dialog', {
			title: 'Select Adhan File (.mp3)',
			message: 'Select Adhan File',
			filters: [{ name: 'Audio', extensions: ['mp3'] }],
		});

		// set input
		if (dialog) {
			setAdhanInput(dialog as string);
			if (selectAdhan === 'Fajr') {
				setAdhanFajr(dialog[0] as string);
			} else {
				setAdhanNormal(dialog[0] as string);
			}

			checkChanges();
		}
	};

	const handlerRestoreDefaultAdhan = () => {
		// stop player and set not playing
		if (adhanPlayer) adhanPlayer.stop();
		setAdhanPlaying(false);

		setAdhanInput(window.electron.ipcRenderer.sendSync(`get-default-adhan-${selectAdhan.toLowerCase()}`) as unknown as string);
		if (selectAdhan === 'Fajr') {
			setAdhanFajr('auto');
		} else {
			setAdhanNormal('auto');
		}

		checkChanges();
	};

	// --------------------------------------------------------------------------
	// location
	const [locMode, setLocMode] = useState<'auto' | 'manual'>('auto');
	const [locCity, setLocCity] = useState<string>('');
	const [locLat, setLocLat] = useState<string>('');
	const [locLang, setLocLang] = useState<string>('');
	const [locUpdateEveryStartup, setLocUpdateEveryStartup] = useState<boolean>(false);
	const handleLocModeChange = async (e: ChangeEvent<HTMLInputElement>) => {
		setLocMode(e.target.value as 'auto' | 'manual');
		// if auto, fetch location
		if (e.target.value === 'auto') {
			if (currentConfig.locationOption.mode === 'auto') {
				setLocCity(currentConfig.locationOption.city);
				setLocLat(currentConfig.locationOption.latitude);
				setLocLang(currentConfig.locationOption.longitude);
			} else {
				setSnackbarLoading(true);
				setShowSnackbar(true);
				setSnackbarMsg('Fetching location. Please wait...');
				setSnackbarSeverity('info');
				await sleep(100);
				// get data
				const { city, latitude, longitude } = window.electron.ipcRenderer.sendSync('get-location-auto', currentConfig) as getPosition_absolute_I;

				setLocCity(city);
				setLocLat(latitude);
				setLocLang(longitude);

				// snackbar
				setSnackbarLoading(false);
				setShowSnackbar(false);
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

	const getCityLatLang_Auto = async () => {
		setSnackbarLoading(true);
		setShowSnackbar(true);
		setSnackbarMsg('Fetching location. Please wait...');
		setSnackbarSeverity('info');

		await sleep(100);
		const { city, latitude, longitude, successGet } = window.electron.ipcRenderer.sendSync('get-location-auto', currentConfig) as getPosition_absolute_I;

		setSnackbarLoading(false);
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

	const getCityLatLang_Manual = async () => {
		setSnackbarLoading(true);
		setShowSnackbar(true);
		setSnackbarMsg('Fetching location. Please wait...');
		setSnackbarSeverity('info');

		await sleep(100);
		const { success, result }: any = window.electron.ipcRenderer.sendSync('get-location-manual', locCity);

		setSnackbarLoading(false);
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
	const [tzMode, setTzMode] = useState<'auto' | 'manual'>('auto');
	const [timezone, setTimezone] = useState<string>('UTC');
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
	// App Setting
	const colorMode = useContext(ColorModeContext) as ColorModeContextInterface;

	const handleColorModeChange = (_e: ChangeEvent<HTMLInputElement>) => {
		colorMode.toggleColorMode();
		checkChanges();
	};

	const [runAtStartup, setRunAtStartup] = useState<boolean>(true);
	const [checkUpdateStartup, setcheckUpdateStartup] = useState<boolean>(true);
	const [clockStyle, setClockStyle] = useState<string | 'AM/PM' | '24h'>('AM/PM');
	const [hijriCalendarOffset, setHijriCalendarOffset] = useState<number>(-1);
	const [detectTimeChange, setDetectTimeChange] = useState<boolean>(false);

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
	const [snackbarLoading, setSnackbarLoading] = useState<boolean>(false);
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
		// -----
		setCalcOptMode(initialConfig.calcOption.mode);
		setCalcOptMethod(initialConfig.calcOption.method);
		setCalcOptMadhab(initialConfig.calcOption.madhab);
		setCalcOptHighLatRule(initialConfig.calcOption.highLatitudeRule);
		// -----
		setCalcOptAdjustment_Fajr(initialConfig.calcOption.adjustments.fajr);
		setCalcOptAdjustment_Sunrise(initialConfig.calcOption.adjustments.sunrise);
		setCalcOptAdjustment_Dhuhr(initialConfig.calcOption.adjustments.dhuhr);
		setCalcOptAdjustment_Asr(initialConfig.calcOption.adjustments.asr);
		setCalcOptAdjustment_Maghrib(initialConfig.calcOption.adjustments.maghrib);
		setCalcOptAdjustment_Isha(initialConfig.calcOption.adjustments.isha);
		// -----
		setFjr_bool_ontime(initialConfig.reminderOption.fajr.remindWhenOnTime);
		setFjr_bool_before(initialConfig.reminderOption.fajr.earlyReminder);
		setFjr_bool_after(initialConfig.reminderOption.fajr.afterReminder);
		setFjr_bool_adhan(initialConfig.reminderOption.fajr.playAdhan);
		setFjr_bool_popup(initialConfig.reminderOption.fajr.popup);
		setFjr_number_before(initialConfig.reminderOption.fajr.earlyTime);
		setFjr_number_after(initialConfig.reminderOption.fajr.afterTime);
		// -----
		setSnr_bool_ontime(initialConfig.reminderOption.sunrise.remindWhenOnTime);
		setSnr_bool_before(initialConfig.reminderOption.sunrise.earlyReminder);
		setSnr_bool_after(initialConfig.reminderOption.sunrise.afterReminder);
		setSnr_bool_popup(initialConfig.reminderOption.sunrise.popup);
		setSnr_number_before(initialConfig.reminderOption.sunrise.earlyTime);
		setSnr_number_after(initialConfig.reminderOption.sunrise.afterTime);
		// -----
		setDhr_bool_ontime(initialConfig.reminderOption.dhuhr.remindWhenOnTime);
		setDhr_bool_before(initialConfig.reminderOption.dhuhr.earlyReminder);
		setDhr_bool_after(initialConfig.reminderOption.dhuhr.afterReminder);
		setDhr_bool_adhan(initialConfig.reminderOption.dhuhr.playAdhan);
		setDhr_bool_popup(initialConfig.reminderOption.dhuhr.popup);
		setDhr_number_before(initialConfig.reminderOption.dhuhr.earlyTime);
		setDhr_number_after(initialConfig.reminderOption.dhuhr.afterTime);
		// -----
		setAsr_bool_ontime(initialConfig.reminderOption.asr.remindWhenOnTime);
		setAsr_bool_before(initialConfig.reminderOption.asr.earlyReminder);
		setAsr_bool_after(initialConfig.reminderOption.asr.afterReminder);
		setAsr_bool_adhan(initialConfig.reminderOption.asr.playAdhan);
		setAsr_bool_popup(initialConfig.reminderOption.asr.popup);
		setAsr_number_before(initialConfig.reminderOption.asr.earlyTime);
		setAsr_number_after(initialConfig.reminderOption.asr.afterTime);
		// -----
		setMgr_bool_ontime(initialConfig.reminderOption.maghrib.remindWhenOnTime);
		setMgr_bool_before(initialConfig.reminderOption.maghrib.earlyReminder);
		setMgr_bool_after(initialConfig.reminderOption.maghrib.afterReminder);
		setMgr_bool_adhan(initialConfig.reminderOption.maghrib.playAdhan);
		setMgr_bool_popup(initialConfig.reminderOption.maghrib.popup);
		setMgr_number_before(initialConfig.reminderOption.maghrib.earlyTime);
		setMgr_number_after(initialConfig.reminderOption.maghrib.afterTime);
		// -----
		setIsha_bool_ontime(initialConfig.reminderOption.isha.remindWhenOnTime);
		setIsha_bool_before(initialConfig.reminderOption.isha.earlyReminder);
		setIsha_bool_after(initialConfig.reminderOption.isha.afterReminder);
		setIsha_bool_adhan(initialConfig.reminderOption.isha.playAdhan);
		setIsha_bool_popup(initialConfig.reminderOption.isha.popup);
		setIsha_number_before(initialConfig.reminderOption.isha.earlyTime);
		setIsha_number_after(initialConfig.reminderOption.isha.afterTime);
		// -----
		setAdhanInput(initialConfig.adhanSoundPath.fajr === 'auto' ? (window.electron.ipcRenderer.sendSync('get-default-adhan-fajr') as string) : initialConfig.adhanSoundPath.fajr);
		setAdhanFajr(initialConfig.adhanSoundPath.fajr === 'auto' ? (window.electron.ipcRenderer.sendSync('get-default-adhan-fajr') as string) : initialConfig.adhanSoundPath.fajr);
		setAdhanNormal(initialConfig.adhanSoundPath.normal === 'auto' ? (window.electron.ipcRenderer.sendSync('get-default-adhan-normal') as string) : initialConfig.adhanSoundPath.normal);
		// -----
		setLocMode(initialConfig.locationOption.mode);
		setLocCity(initialConfig.locationOption.city);
		setLocLat(initialConfig.locationOption.latitude);
		setLocLang(initialConfig.locationOption.longitude);
		setLocUpdateEveryStartup(initialConfig.locationOption.updateEveryStartup);
		// -----
		setTzMode(initialConfig.timezoneOption.mode);
		setTimezone(initialConfig.timezoneOption.timezone);
		// -----
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
		setCurrentConfig(window.electron.ipcRenderer.sendSync('get-config') as configInterface);

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
		// -----
		currentConfig.calcOption.highLatitudeRule = calcOptHighLatRule;
		currentConfig.calcOption.adjustments.fajr = calcOptAdjustment_Fajr;
		currentConfig.calcOption.adjustments.sunrise = calcOptAdjustment_Sunrise;
		currentConfig.calcOption.adjustments.dhuhr = calcOptAdjustment_Dhuhr;
		currentConfig.calcOption.adjustments.asr = calcOptAdjustment_Asr;
		currentConfig.calcOption.adjustments.maghrib = calcOptAdjustment_Maghrib;
		currentConfig.calcOption.adjustments.isha = calcOptAdjustment_Isha;
		// -----
		currentConfig.reminderOption.fajr.remindWhenOnTime = rm_fjr_bool_ontime;
		currentConfig.reminderOption.fajr.earlyReminder = rm_fjr_bool_before;
		currentConfig.reminderOption.fajr.afterReminder = rm_fjr_bool_after;
		currentConfig.reminderOption.fajr.playAdhan = rm_fjr_bool_adhan;
		currentConfig.reminderOption.fajr.popup = rm_fjr_bool_popup;
		currentConfig.reminderOption.fajr.earlyTime = rm_fjr_number_before;
		currentConfig.reminderOption.fajr.afterTime = rm_fjr_number_after;
		// -----
		currentConfig.reminderOption.sunrise.remindWhenOnTime = rm_snr_bool_ontime;
		currentConfig.reminderOption.sunrise.earlyReminder = rm_snr_bool_before;
		currentConfig.reminderOption.sunrise.afterReminder = rm_snr_bool_after;
		currentConfig.reminderOption.sunrise.popup = rm_snr_bool_popup;
		currentConfig.reminderOption.sunrise.earlyTime = rm_snr_number_before;
		currentConfig.reminderOption.sunrise.afterTime = rm_snr_number_after;
		// -----
		currentConfig.reminderOption.dhuhr.remindWhenOnTime = rm_dhr_bool_ontime;
		currentConfig.reminderOption.dhuhr.earlyReminder = rm_dhr_bool_before;
		currentConfig.reminderOption.dhuhr.afterReminder = rm_dhr_bool_after;
		currentConfig.reminderOption.dhuhr.playAdhan = rm_dhr_bool_adhan;
		currentConfig.reminderOption.dhuhr.popup = rm_dhr_bool_popup;
		currentConfig.reminderOption.dhuhr.earlyTime = rm_dhr_number_before;
		currentConfig.reminderOption.dhuhr.afterTime = rm_dhr_number_after;
		// -----
		currentConfig.reminderOption.asr.remindWhenOnTime = rm_asr_bool_ontime;
		currentConfig.reminderOption.asr.earlyReminder = rm_asr_bool_before;
		currentConfig.reminderOption.asr.afterReminder = rm_asr_bool_after;
		currentConfig.reminderOption.asr.playAdhan = rm_asr_bool_adhan;
		currentConfig.reminderOption.asr.popup = rm_asr_bool_popup;
		currentConfig.reminderOption.asr.earlyTime = rm_asr_number_before;
		currentConfig.reminderOption.asr.afterTime = rm_asr_number_after;
		// -----
		currentConfig.reminderOption.maghrib.remindWhenOnTime = rm_mgr_bool_ontime;
		currentConfig.reminderOption.maghrib.earlyReminder = rm_mgr_bool_before;
		currentConfig.reminderOption.maghrib.afterReminder = rm_mgr_bool_after;
		currentConfig.reminderOption.maghrib.playAdhan = rm_mgr_bool_adhan;
		currentConfig.reminderOption.maghrib.popup = rm_mgr_bool_popup;
		currentConfig.reminderOption.maghrib.earlyTime = rm_mgr_number_before;
		currentConfig.reminderOption.maghrib.afterTime = rm_mgr_number_after;
		// -----
		currentConfig.reminderOption.isha.remindWhenOnTime = rm_isha_bool_ontime;
		currentConfig.reminderOption.isha.earlyReminder = rm_isha_bool_before;
		currentConfig.reminderOption.isha.afterReminder = rm_isha_bool_after;
		currentConfig.reminderOption.isha.playAdhan = rm_isha_bool_adhan;
		currentConfig.reminderOption.isha.popup = rm_isha_bool_popup;
		currentConfig.reminderOption.isha.earlyTime = rm_isha_number_before;
		currentConfig.reminderOption.isha.afterTime = rm_isha_number_after;
		// -----
		currentConfig.adhanSoundPath.fajr = adhanFajr === 'auto' ? 'auto' : adhanFajr;
		currentConfig.adhanSoundPath.normal = adhanNormal === 'auto' ? 'auto' : adhanNormal;
		// -----
		currentConfig.locationOption.mode = locMode;
		currentConfig.locationOption.city = locCity;
		currentConfig.locationOption.latitude = locLat;
		currentConfig.locationOption.longitude = locLang;
		currentConfig.locationOption.updateEveryStartup = locUpdateEveryStartup;
		// -----
		currentConfig.timezoneOption.mode = tzMode;
		currentConfig.timezoneOption.timezone = timezone;
		// -----
		currentConfig.runAtStartup = runAtStartup;
		currentConfig.checkUpdateAtStartup = checkUpdateStartup;
		currentConfig.clockStyle = clockStyle;
		currentConfig.theme = appTheme;
		currentConfig.hijriCalendarOffset = hijriCalendarOffset;
		currentConfig.detectTimeChange = detectTimeChange;
	};

	// save config
	const saveTheConfig = async () => {
		setSnackbarLoading(true);
		setShowSnackbar(true);
		setSnackbarMsg('Saving changes...');
		setSnackbarSeverity('info');

		await sleep(100);
		// update config
		storeConfig();
		// save config
		const result = window.electron.ipcRenderer.sendSync('save-config', currentConfig);

		setSnackbarLoading(false);
		if (result) {
			// if success
			// reset changed
			setChangesMade(false);
			// show snackbar
			setShowSnackbar(true);
			setSnackbarSeverity('success');
			setSnackbarMsg('Changes saved successfully.');

			// check if path differs from original or not
			if (currentConfig.adhanSoundPath.fajr !== initialConfig.adhanSoundPath.fajr || currentConfig.adhanSoundPath.normal !== initialConfig.adhanSoundPath.normal) {
				// signal ipc path is updated
				window.electron.ipcRenderer.send('update-path');
			}
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
		setInitialValue();
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
			<Snackbar anchorOrigin={{ vertical: 'top', horizontal: 'left' }} open={showSnackbar} autoHideDuration={snackbarLoading ? null : 3500} onClose={handleSnackbarClose}>
				<Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
					{snackbarLoading ? <CircularProgress sx={{ mr: 0.75 }} color={'secondary'} size={10} /> : null}
					{snackbarMsg}
				</Alert>
			</Snackbar>
			{/* -------------------------------------------------------------------------------------------------------------------------------------------- */}
			<ReactHowler
				// ex: src='D://Coding/@Projects/Electron/simple-prayertime-reminder/assets/adhan.mp3'
				src={adhanInput}
				playing={adhanPlaying}
				ref={(ref: any) => {
					setAdhanPlayer(ref);
				}}
				onEnd={() => {
					setAdhanPlaying(false);
				}}
			/>
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
											size='small'
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
											size='small'
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
											size='small'
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
						{/* reminder */}
						<Grid item xs={6}>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									flexWrap: 'wrap',
								}}
							>
								<TimerOutlinedIcon color='primary' /> <h3 style={{ paddingLeft: '.5rem' }}>Reminder</h3>
							</div>
							<Box
								sx={{
									height: 350,
									display: 'flex',
									flexGrow: '1',
								}}
							>
								<DataGrid rows={reminderGridRowsProp} columns={reminderGridColumns} experimentalFeatures={{ newEditingApi: true }} hideFooter={true} />
							</Box>
							<Box sx={{ display: 'flex', flexDirection: 'row' }}>
								<FormControl sx={{ minWidth: '120px', mr: 2, pt: 1 }}>
									<FormLabel>Adhan Type</FormLabel>
									<Select size='small' value={selectAdhan} onChange={handleSelectAdhan}>
										<MenuItem value='Fajr'>Fajr</MenuItem>
										<MenuItem value='Normal'>Normal</MenuItem>
									</Select>
								</FormControl>
								<span style={{ paddingTop: '30px', width: '800px' }}>
									<TextField
										fullWidth
										helperText='Must be a valid .mp3 file'
										id='filepath'
										label='File Path'
										variant='outlined'
										size='small'
										value={adhanInput}
										InputProps={{
											readOnly: true,
											endAdornment: (
												<InputAdornment position='end'>
													<IconButton aria-label='Open Folder' onClick={handleAdhanInput} edge='end'>
														<FolderOpenIcon />
													</IconButton>
													<IconButton
														aria-label='Play adhan'
														onClick={() => {
															setAdhanPlaying(!adhanPlaying);
														}}
														edge='end'
													>
														{adhanPlaying ? <PauseIcon /> : <PlayCircleIcon />}
													</IconButton>
													<IconButton
														aria-label='Stop adhan'
														onClick={() => {
															adhanPlayer.stop();
															setAdhanPlaying(false);
														}}
														edge='end'
													>
														<StopIcon />
													</IconButton>
													<Tooltip title='Click to restore default adhan path' arrow>
														<IconButton
															aria-label='Restore default'
															onClick={() => {
																handlerRestoreDefaultAdhan();
															}}
															edge='end'
														>
															<RestartAltIcon />
														</IconButton>
													</Tooltip>
												</InputAdornment>
											),
										}}
									/>
								</span>
							</Box>
						</Grid>
					</Grid>
					{/* -------------------------------------------------------------------------------------------------------------------------------------------- */}
					{/* location, timezone */}
					<Divider sx={{ mt: 2, mb: 2 }} />
					<Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
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
								<LocationOnOutlinedIcon color='primary' /> <h3 style={{ paddingLeft: '.5rem' }}>Location</h3>
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
										<Tooltip title='Click to sync location automatically. Data are fetched from geoplugin.net' arrow>
											<IconButton aria-label='sync' disabled={locMode === 'manual' ? true : false} onClick={getCityLatLang_Auto}>
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
									<Box
										sx={{
											display: 'flex',
											flexDirection: 'row',
										}}
									>
										<Tooltip title='*Will only update if auto mode is enabled' arrow>
											<FormControlLabel
												control={<Checkbox sx={{ ml: 0.5 }} checked={locUpdateEveryStartup} onChange={handleLocUpdateEveryStartupChange} disabled={locMode === 'auto' ? false : true} />}
												label='Update location on app start'
											/>
										</Tooltip>
									</Box>
								</FormControl>
							</Box>
						</Grid>
						{/* ------------------------------------- */}
						{/* Timezone */}
						<Grid item xs={6}>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									flexWrap: 'wrap',
								}}
							>
								<AccessTimeOutlinedIcon color='primary' /> <h3 style={{ paddingLeft: '.5rem' }}>Timezone</h3>
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
										/>
									</FormControl>
								</FormControl>
							</Box>

							<FormControl>
								<FormLabel>Sync Option</FormLabel>
								<Box
									sx={{
										display: 'flex',
										flexDirection: 'row',
									}}
								>
									<Tooltip title='The app will check every 30 seconds for local time changes. Recommended to turn off if you are not messing arround with the local time/clock of your PC' arrow>
										<FormControlLabel control={<Checkbox checked={detectTimeChange} onChange={handleDetectTimeChange} />} label='Detect local time change' />
									</Tooltip>
								</Box>
							</FormControl>

							<FormControl sx={{ minWidth: '120px', mr: 2 }}>
								<FormLabel>Clock Style</FormLabel>
								<Select size='small' value={clockStyle} onChange={handleClockStyleChange}>
									<MenuItem value='AM/PM'>AM/PM</MenuItem>
									<MenuItem value='24h'>24h</MenuItem>
								</Select>
							</FormControl>
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
