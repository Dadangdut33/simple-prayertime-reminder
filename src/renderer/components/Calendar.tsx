import { useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';

export const Calendar = () => {
	const [value, setValue] = useState<Date | null>(new Date());

	return (
		<>
			<CssBaseline />
			<LocalizationProvider dateAdapter={AdapterMoment}>
				<StaticDatePicker
					displayStaticWrapperAs='desktop'
					openTo='day'
					value={value}
					onChange={(newValue) => {
						console.log(newValue);

						setValue(newValue);
					}}
					renderInput={(params) => <TextField {...params} />}
				/>
			</LocalizationProvider>
		</>
	);
};
