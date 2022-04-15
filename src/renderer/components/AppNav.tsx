import { useState, SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';

// MUI elements
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Home from '@mui/icons-material/Home';
import Divider from '@mui/material/Divider';

// Icons
import DateRangeIcon from '@mui/icons-material/DateRange';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export const AppNav = ({ theme, changesMade }: any) => {
	const [value, setValue] = useState(0);
	const navigate = useNavigate();
	const navigateMap: any = {
		0: '/',
		1: '/calendar',
		2: '/settings',
		3: '/about',
	};

	const handleChange = (_event: SyntheticEvent, newValue: number) => {
		if (changesMade) window.electron.ipcRenderer.send('invoke-open-changes-made');
		else {
			setValue(newValue);
			navigate(navigateMap[newValue]);
		}
	};

	return (
		<>
			<CssBaseline />
			<Box sx={{ width: '100%' }}>
				<Tabs value={value} onChange={handleChange} aria-label='app nav bar' centered>
					<Tab
						icon={<Home />}
						iconPosition='start'
						sx={{
							'&:hover': {
								color: theme === 'dark' ? '#808080' : '#ff99aa',
							},
						}}
						label='Main Menu'
					/>
					<Tab
						icon={<DateRangeIcon />}
						iconPosition='start'
						sx={{
							'&:hover': {
								color: theme === 'dark' ? '#808080' : '#ff99aa',
							},
						}}
						label='Calendar'
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
