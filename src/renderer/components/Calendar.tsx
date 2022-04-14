import { useState } from 'react';

// MUI elements
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';

// Datepicker
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CalendarPicker } from '@mui/x-date-pickers/CalendarPicker';

export const Calendar = () => {
	const [value, setValue] = useState<Date | null>(new Date());

	return (
		<>
			<CssBaseline />
			<Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', justifyContent: 'center', color: 'text.primary', borderRadius: 1, p: 3, mt: 1 }}>
				<LocalizationProvider dateAdapter={AdapterDateFns}>
					<Grid item xs={12} md={6}>
						<CalendarPicker
							date={value}
							onChange={(newValue) => {
								console.log(newValue);

								setValue(newValue);
							}}
						/>
					</Grid>
				</LocalizationProvider>
			</Box>
		</>
	);
};
