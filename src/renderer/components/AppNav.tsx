import { useState, SyntheticEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// MUI elements
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Divider from '@mui/material/Divider';

// Icons
import DateRangeIcon from '@mui/icons-material/DateRange';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';

export const AppNav = ({ theme, changesMade }: any) => {
	const [value, setValue] = useState(0);
	const navigate = useNavigate();
	const navigateMap: any = {
		0: '/',
		1: '/schedule',
		2: '/settings',
		3: '/about',
	};

	const valueMap: any = {
		'/': 0,
		'/schedule': 1,
		'/settings': 2,
		'/about': 3,
	};

	const handleChange = (_event: SyntheticEvent, newValue: number) => {
		if (changesMade) window.electron.ipcRenderer.send('invoke-open-changes-made', navigateMap[newValue]);
		else {
			window.electron.ipcRenderer.send('set-current-page', navigateMap[newValue]);
			setValue(newValue);
			navigate(navigateMap[newValue]);
		}
	};

	const pageChangeFunc = (arg: any) => {
		window.electron.ipcRenderer.send('set-current-page', navigateMap[arg]);
		setValue(valueMap[arg]);
		navigate(arg);
	};

	// listener for page switching
	useEffect(() => {
		window.electron.ipcRenderer.on('page-change', pageChangeFunc);

		return () => {
			window.electron.ipcRenderer.removeEventListener('page-change', pageChangeFunc);
		};
	}, []);

	return (
		<>
			<CssBaseline />
			<Box sx={{ width: '100%' }}>
				<Tabs value={value} onChange={handleChange} aria-label='app nav bar' centered>
					<Tab
						icon={<AccessTimeOutlinedIcon />}
						iconPosition='start'
						sx={{
							'&:hover': {
								color: theme === 'dark' ? '#808080' : '#ff99aa',
							},
						}}
						label='Praytime'
					/>
					<Tab
						icon={<DateRangeIcon />}
						iconPosition='start'
						sx={{
							'&:hover': {
								color: theme === 'dark' ? '#808080' : '#ff99aa',
							},
						}}
						label='Schedule'
					/>
					<Tab
						icon={<SettingsIcon />}
						iconPosition='start'
						sx={{
							'&:hover': {
								color: theme === 'dark' ? '#808080' : '#ff99aa',
							},
						}}
						label='Settings'
					/>
					<Tab
						icon={<InfoOutlinedIcon />}
						iconPosition='start'
						sx={{
							'&:hover': {
								color: theme === 'dark' ? '#808080' : '#ff99aa',
							},
						}}
						label='About'
					/>
				</Tabs>
				<Divider variant='middle' />
			</Box>
		</>
	);
};
