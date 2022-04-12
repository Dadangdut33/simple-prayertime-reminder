import { useState, SyntheticEvent } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import PhoneIcon from '@mui/icons-material/Phone';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PersonPinIcon from '@mui/icons-material/PersonPin';
import Divider from '@mui/material/Divider';
import { Box } from '@mui/material';

export const AppNav = () => {
	const [value, setValue] = useState(0);

	const handleChange = (_event: SyntheticEvent, newValue: number) => {
		setValue(newValue);
	};

	return (
		<>
			<CssBaseline />
			<Box sx={{ width: '100%' }}>
				<Tabs value={value} onChange={handleChange} aria-label='icon label tabs example' centered>
					<Tab icon={<PhoneIcon />} label='RECENTS' />
					<Tab icon={<FavoriteIcon />} label='FAVORITES' />
					<Tab icon={<PersonPinIcon />} label='NEARBY' />
				</Tabs>
				<Divider variant='middle' />
			</Box>
		</>
	);
};
