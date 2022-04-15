import { ColorModeContextInterface } from 'renderer/interfaces';
import { configInterface, getPosition_absolute_I } from 'main/interfaces';
import { useContext, forwardRef, useState, ChangeEvent } from 'react';
import useTheme from '@mui/material/styles/useTheme';
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
import Switch from '@mui/material/Switch';
import InputAdornment from '@mui/material/InputAdornment';
import Checkbox from '@mui/material/Checkbox';
import Select from '@mui/material/Select';
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

export const Settings = ({ ColorModeContext, changesMade, setChangesMade }: any) => {
	// config on tab open
	const initialConfig = window.electron.ipcRenderer.sendSync('get-config') as configInterface;
	const [currentConfig, setCurrentConfig] = useState<configInterface>(initialConfig); // current config

	// --------------------------------------------------------------------------
	// location
	const [locMode, setLocMode] = useState(currentConfig.locationOption.mode);
	const [locCity, setLocCity] = useState(currentConfig.locationOption.city);
	const [locLat, setLocLat] = useState(currentConfig.locationOption.latitude);
	const [locLang, setLocLang] = useState(currentConfig.locationOption.longitude);
	const [locUpdateEveryStartup, setLocUpdateEveryStartup] = useState(currentConfig.locationOption.updateEveryStartup);
	const handleLocModeChange = (e: ChangeEvent<HTMLInputElement>) => {
		checkChanges();
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
	};

	const handleCityChange = (e: ChangeEvent<HTMLInputElement>) => {
		checkChanges();
		setLocCity(e.target.value);
	};

	const handleLatChange = (e: ChangeEvent<HTMLInputElement>) => {
		checkChanges();
		setLocLat(e.target.value);
	};

	const handleLangChange = (e: ChangeEvent<HTMLInputElement>) => {
		checkChanges();
		setLocLang(e.target.value);
	};

	const handleLocUpdateEveryStartupChange = (e: ChangeEvent<HTMLInputElement>) => {
		checkChanges();
		setLocUpdateEveryStartup(e.target.checked);
	};

	const getCityLatLang_Auto = () => {
		const { city, latitude, longitude, successGet } = window.electron.ipcRenderer.sendSync('get-location-auto', currentConfig) as getPosition_absolute_I;

		if (successGet) {
			checkChanges();
			setLocCity(city);
			setLocLat(latitude);
			setLocLang(longitude);

			// snackbar
			setShowSnackbar(true);
			setSnackbarMsg('Location fetched successfully!');
			setSnackbarSeverity('success');
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
			checkChanges();
			setShowSnackbar(true);
			setSnackbarSeverity('success');
			setSnackbarMsg('Location fetched successfully! City inputted has been replaced with the data fetched.');
			setLocCity(result[0].name);
			setLocLat(result[0].loc.coordinates[1]);
			setLocLang(result[0].loc.coordinates[0]);
		}
	};

	// --------------------------------------------------------------------------
	// available tz
	const tzList = window.electron.ipcRenderer.sendSync('get-tz-list') as string[];

	// timezone
	const [tzMode, setTzMode] = useState(currentConfig.timezoneOption.mode);
	const [timezone, setTimezone] = useState(currentConfig.timezoneOption.timezone);

	const handleTzModeChange = (e: ChangeEvent<HTMLInputElement>) => {
		checkChanges();
		setTzMode(e.target.value as 'auto' | 'manual');
		if (e.target.value === 'auto') {
			if (currentConfig.timezoneOption.mode === 'auto') {
				setTimezone(currentConfig.timezoneOption.timezone);
			} else {
				const timezone = window.electron.ipcRenderer.sendSync('get-tz-auto', currentConfig) as string;
				setTimezone(timezone);
			}
		}
	};

	const handleTimezoneChange = (e: any) => {
		// not importing the interface for IDE performance sake
		checkChanges();
		setTimezone(e.target.value);
	};

	// --------------------------------------------------------------------------
	// geoloc
	const [geolocMode, setGeolocMode] = useState(currentConfig.geoLocAPIKey.mode);
	const [geolocKey, setGeolocKey] = useState(currentConfig.geoLocAPIKey.key);

	const handleGeolocModeChange = (e: ChangeEvent<HTMLInputElement>) => {
		checkChanges();
		setGeolocMode(e.target.value as 'auto' | 'manual');
	};

	const handleGeolocKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
		checkChanges();
		setGeolocKey(e.target.value);
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
	// App Setting
	const theme = useTheme();
	const colorMode = useContext(ColorModeContext) as ColorModeContextInterface;

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
		changesMade: [handleDialogChangesMade, 'You have unsaved changes. Do you want to save them?'],
		save: [handleDialogSave, 'Are you sure you want to save the settings changes?'],
		cancel: [handleDialogCancel, 'Are you sure you want to cancel changes made?'],
	};

	// --------------------------------------------------------------------------
	// reset config
	const resetConfig = () => {
		setCurrentConfig(initialConfig);
		setLocMode(initialConfig.locationOption.mode);
		setLocCity(initialConfig.locationOption.city);
		setLocLat(initialConfig.locationOption.latitude);
		setLocLang(initialConfig.locationOption.longitude);
		setLocUpdateEveryStartup(initialConfig.locationOption.updateEveryStartup);
		setTzMode(initialConfig.timezoneOption.mode);
		setTimezone(initialConfig.timezoneOption.timezone);
	};

	// save config
	const saveTheConfig = () => {
		// update config
		currentConfig.locationOption.mode = locMode;
		currentConfig.locationOption.city = locCity;
		currentConfig.locationOption.latitude = locLat;
		currentConfig.locationOption.longitude = locLang;
		currentConfig.locationOption.updateEveryStartup = locUpdateEveryStartup;
		currentConfig.timezoneOption.mode = tzMode;
		currentConfig.timezoneOption.timezone = timezone;
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
		// compare initial config and current config
		// if changed set changed to true
		// else set changed to false
	};

	// --------------------------------------------------------------------------
	// listener for page switching
	window.electron.ipcRenderer.on('open-changes-made', (_event, _arg) => {
		setCurrentDialog('changes');
		setDialogOpen(true);
	});

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
			<Snackbar anchorOrigin={{ vertical: 'top', horizontal: 'center' }} open={showSnackbar} autoHideDuration={3500} onClose={handleSnackbarClose}>
				<Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
					{snackbarMsg}
				</Alert>
			</Snackbar>
			{/* -------------------------------------------------------------------------------------------------------------------------------------------- */}
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
				<Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
					{/* ------------------------------------- */}
					{/* location */}
					<Grid item xs={4}>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								flexWrap: 'wrap',
							}}
						>
							<LocationOnOutlinedIcon /> <h3 style={{ paddingLeft: '.5rem' }}>Location options</h3>
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
										control={<Checkbox sx={{ ml: 1 }} checked={locUpdateEveryStartup} onChange={handleLocUpdateEveryStartupChange} disabled={locMode === 'auto' ? false : true} />}
										label='Update location on app start'
									/>
								</Tooltip>
							</FormControl>
						</Box>
					</Grid>
					{/* ------------------------------------- */}
					{/* Timezone */}
					<Grid item xs={4}>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								flexWrap: 'wrap',
							}}
						>
							<AccessTimeOutlinedIcon /> <h3 style={{ paddingLeft: '.5rem' }}>Timezone options</h3>
						</div>
						<Box
							component={'form'}
							noValidate
							autoComplete='off'
							sx={{
								display: 'flex',
								flexDirection: 'column',
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
								<FormControl fullWidth sx={{ m: 1, ml: 0.5 }}>
									<InputLabel id='select-timezone'>Timezone</InputLabel>
									<Select
										labelId='select-timezone'
										id='select-timezone-select'
										size='small'
										value={timezone}
										label='Timezone'
										onChange={handleTimezoneChange}
										disabled={tzMode === 'auto' ? true : false}
									>
										{tzList.map((tz, index) => (
											<MenuItem key={index} value={tz}>
												{tz}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							</FormControl>
						</Box>
					</Grid>
					{/* ------------------------------------- */}
					{/* api keys */}
					<Grid item xs={4}>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								flexWrap: 'wrap',
							}}
						>
							<KeyIcon /> <h3 style={{ paddingLeft: '.5rem' }}>API Key</h3>
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
				</Grid>

				{/* -------------------------------------------------------------------------------------------------------------------------------------------- */}
				<Box sx={{ '& button': { m: 1 }, display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
					{/* Cancel changes */}
					<Button
						variant='contained'
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
		</>
	);
};
