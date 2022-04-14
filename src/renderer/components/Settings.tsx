import { ColorModeContextInterface } from 'renderer/interfaces';
import { configInterface } from 'main/interfaces';
import { useContext, useEffect, useState } from 'react';
import useTheme from '@mui/material/styles/useTheme';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Tooltip from '@mui/material/Tooltip';

// Form
import IconButton from '@mui/material/IconButton';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';

// Icons
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import SyncIcon from '@mui/icons-material/Sync';

export const Settings = ({ ColorModeContext }: any) => {
	// Variables
	// config on tab open
	const [currentConfig, setCurrentConfig] = useState<configInterface>(window.electron.ipcRenderer.sendSync('get-config') as configInterface);

	// --------------------------------------------------------------------------
	// location
	const [locAuto, setLocAuto] = useState(currentConfig.locationOption.mode);
	const [locCity, setLocCity] = useState(currentConfig.locationOption.city);
	const [locLat, setLocLat] = useState(currentConfig.locationOption.latitude);
	const [locLang, setLocLang] = useState(currentConfig.locationOption.longitude);

	// --------------------------------------------------------------------------
	// misc
	const theme = useTheme();
	const colorMode = useContext(ColorModeContext) as ColorModeContextInterface;

	const testIpc = () => {
		const testPing = window.electron.ipcRenderer.sendSync('test-sync', 'bruh');
		console.log('outside ipc', testPing);
	};

	// Func
	// --------------------------------------------------------------------------
	// location
	const handleLocAutoManual = (e: React.ChangeEvent<HTMLInputElement>) => {
		setLocAuto(e.target.value as 'auto' | 'manual');
		// if auto, fetch location
		if (e.target.value === 'auto') {
			if (currentConfig.locationOption.mode === 'auto') {
				setLocCity(currentConfig.locationOption.city);
				setLocLat(currentConfig.locationOption.latitude);
				setLocLang(currentConfig.locationOption.longitude);
			} else {
				const { city, latitude, longitude }: any = window.electron.ipcRenderer.sendSync('get-location');
				setLocCity(city);
				setLocLat(latitude);
				setLocLang(longitude);
			}
		}
	};

	// --------------------------------------------------------------------------

	return (
		<>
			<CssBaseline />
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
				<Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
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
								'& .MuiTextField-root': { m: 1 },
							}}
						>
							<FormControl>
								<FormLabel id='location-mode-formlabel' sx={{ ml: 1 }}>
									Mode
								</FormLabel>
								<RadioGroup sx={{ ml: 1 }} row aria-labelledby='location-mode' name='row-radio-buttons-location-mode' value={locAuto} onChange={handleLocAutoManual}>
									<FormControlLabel value='auto' control={<Radio />} label='Auto' />
									<FormControlLabel value='manual' control={<Radio />} label='Manual' />
									<Tooltip title='Click to sync location automatically' onClick={(e) => console.log(e)}>
										<IconButton aria-label='delete' disabled={locAuto === 'manual' ? true : false}>
											<SyncIcon />
										</IconButton>
									</Tooltip>
								</RadioGroup>

								<TextField id='city' label='City' variant='outlined' size='small' value={locCity} onChange={(e) => setLocCity(e.target.value)} disabled={locAuto === 'auto' ? true : false} />
								<TextField
									id='latitude'
									label='latitude'
									variant='outlined'
									size='small'
									value={locLat}
									onChange={(e) => setLocLat(e.target.value)}
									disabled={locAuto === 'auto' ? true : false}
								/>
								<TextField
									id='longitude'
									label='longitude'
									variant='outlined'
									size='small'
									value={locLang}
									onChange={(e) => setLocLang(e.target.value)}
									disabled={locAuto === 'auto' ? true : false}
								/>
							</FormControl>
						</Box>
					</Grid>
					<Grid item>
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
								'& .MuiTextField-root': { m: 1, width: '25ch' },
							}}
						>
							<TextField id='city' label='City' variant='outlined' size='small' />
							<TextField id='latitude' label='latitude' variant='outlined' size='small' />
							<TextField id='longitude' label='longitude' variant='outlined' size='small' />
						</Box>
					</Grid>
					<Grid item>
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
								'& .MuiTextField-root': { m: 1, width: '25ch' },
							}}
						>
							<TextField id='city' label='City' variant='outlined' size='small' />
							<TextField id='latitude' label='latitude' variant='outlined' size='small' />
							<TextField id='longitude' label='longitude' variant='outlined' size='small' />
						</Box>
					</Grid>
				</Grid>
			</Box>
		</>
	);
};
