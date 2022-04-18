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

// Icons
import LocationOnIcon from '@mui/icons-material/LocationOn';

// Date parser
import Moment from 'moment-timezone';

export const Praytime = ({ theme }: any) => {
	const [value, setValue] = useState(new Date());
	const [currentPt, setCurrentPt] = useState<getPrayerTimes_I>(window.electron.ipcRenderer.sendSync('get-this-pt', '') as getPrayerTimes_I);
	const timezone = window.electron.ipcRenderer.sendSync('get-timezone') as string;
	const appSettings = window.electron.ipcRenderer.sendSync('get-config') as configInterface;
	const [remainingTime, setRemainingTime] = useState(0);

	const pt_Map: any = {
		fajr: currentPt.fajrTime,
		sunrise: currentPt.sunriseTime,
		dhuhr: currentPt.dhuhrTime,
		asr: currentPt.asrTime,
		maghrib: currentPt.maghribTime,
		isha: currentPt.ishaTime,
	};

	const getDif = () => {
		const start = Moment(pt_Map[currentPt.current]).tz(timezone);
		const end = Moment(pt_Map[currentPt.next]).tz(timezone);
		const duration = Moment.duration(start.diff(end));

		return Math.abs(duration.asSeconds());
	};

	const getDifInitial = () => {
		const end = Moment(pt_Map[currentPt.next]);
		const startInitial = Moment(new Date());
		const durationInitial = Moment.duration(startInitial.diff(end));

		return Math.abs(durationInitial.asSeconds());
	};

	useEffect(() => {
		getDif();
		const interval = setInterval(() => {
			setValue(new Date());
		}, 1000);

		return () => {
			clearInterval(interval);
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
				<Box sx={{ mt: 2, mb: 2 }}>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							flexWrap: 'wrap',
							paddingRight: '1rem',
						}}
					>
						<LocationOnIcon style={{ paddingBottom: '4px', fontSize: '28px' }} color='primary' />{' '}
						<h2>
							{appSettings.locationOption.city} ({appSettings.locationOption.latitude}, {appSettings.locationOption.longitude})
						</h2>
					</div>
				</Box>

				<Box id='the-clock' className={theme + '-clock'} sx={{ mt: 3, mb: 3 }}>
					<CountdownCircleTimer
						isPlaying
						duration={getDif()}
						initialRemainingTime={getDifInitial()}
						colors={['#004777', '#F7B801', '#A30000', '#A30000']}
						colorsTime={[6, 4, 3, 0]}
						strokeWidth={4}
						size={290}
						onUpdate={(remainingTime: number) => {
							setRemainingTime(remainingTime);
						}}
						onComplete={() => {
							setCurrentPt(window.electron.ipcRenderer.sendSync('get-this-pt', '') as getPrayerTimes_I);

							return {
								shouldRepeat: true,
								newInitialRemainingTime: getDif(),
							};
						}}
					/>
					<div className='analogue' id={theme}>
						<Clock value={value} renderNumbers={true} size={250} minuteHandWidth={3} hourHandWidth={5} secondHandWidth={2} />
					</div>
				</Box>

				<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 6 }}>
					<h3>{currentPt.current.charAt(0).toUpperCase() + currentPt.current.slice(1)}</h3>

					<p>
						{Moment(pt_Map[currentPt.current])
							.tz(timezone)
							.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
					</p>

					<h2>{remainingTime}</h2>
				</Box>
			</Box>
		</>
	);
};
