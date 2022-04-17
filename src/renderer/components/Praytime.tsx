import { useState, useEffect } from 'react';
import { configInterface, getPrayerTimes_I } from 'main/interfaces';

// Clocks
import { CountdownCircleTimer } from 'react-countdown-circle-timer';
// @ts-ignore
import Clock from 'react-clock';
import 'react-clock/dist/Clock.css';

// MUI elements
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';

export const Praytime = ({ theme }: any) => {
	const [value, setValue] = useState(new Date());
	const [currentPt, setCurrentPt] = useState<getPrayerTimes_I>(window.electron.ipcRenderer.sendSync('get-this-pt', '') as getPrayerTimes_I);
	const appSettings = window.electron.ipcRenderer.sendSync('get-config') as configInterface;

	useEffect(() => {
		const interval = setInterval(() => setValue(new Date()), 1000);
		const updateDataInterval = setInterval(() => {
			setCurrentPt(window.electron.ipcRenderer.sendSync('get-this-pt', '') as getPrayerTimes_I);
		}, appSettings.updateEvery_X_Hours * 3600 * 1000);

		return () => {
			clearInterval(interval);
			clearInterval(updateDataInterval);
		};
	}, []);

	return (
		<>
			<CssBaseline />
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					width: '100%',
					alignItems: 'center',
					justifyContent: 'center',
					borderRadius: 1,
					p: 3,
				}}
			>
				<Box id='the-clock' className={theme + '-clock'} sx={{ mt: 3 }}>
					<CountdownCircleTimer isPlaying duration={20} initialRemainingTime={18} colors={['#004777', '#F7B801', '#A30000', '#A30000']} colorsTime={[6, 4, 3, 0]} strokeWidth={4} size={290} />
					<div className='analogue' id={theme}>
						<Clock value={value} renderNumbers={true} size={250} minuteHandWidth={3} hourHandWidth={5} secondHandWidth={2} />
					</div>
				</Box>

				<Box sx={{ mt: 6 }}>tes</Box>
			</Box>
		</>
	);
};
