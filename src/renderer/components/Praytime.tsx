import { useState, useEffect } from 'react';
import { configInterface, getPrayerTimes_I, ColorHex, colorCache, colorCacheGet } from 'main/interfaces';

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
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow';

// Date parser
import Moment from 'moment-timezone';

export const Praytime = ({ theme }: any) => {
	// ----------------------------------------------------------------------------------------------------------------------
	// Config
	const currentPt = window.electron.ipcRenderer.sendSync('get-this-pt') as getPrayerTimes_I;
	const timezone = window.electron.ipcRenderer.sendSync('get-timezone') as string;
	const appSettings = window.electron.ipcRenderer.sendSync('get-config') as configInterface;

	// clock
	const [clockValue, setClockValue] = useState(new Date());
	const [randomColorList, setRandomColorList] = useState<ColorHex[]>([]);
	const [colorChangeSecondsList, setColorChangeSecondsList] = useState<number[]>([]);
	const forbiddenColor = ['#dfdfdf', '#d9d9d9', '#e9e9e9', '#e2e2e2', '#dadada', '#e1e1d7', '#deb4ac', '#db918a']; // Mostly gray
	const amountDivider = 75;

	// ----------------------------------------------------------------------------------------------------------------------
	const pt_Map: any = {
		fajr: currentPt.fajrTime,
		sunrise: currentPt.sunriseTime,
		dhuhr: currentPt.dhuhrTime,
		asr: currentPt.asrTime,
		maghrib: currentPt.maghribTime,
		isha: currentPt.ishaTime,
	};

	const generateRandomHexColor = (amount: number) => {
		let colorList: ColorHex[] = [],
			secondsList: number[] = [];
		for (let i = 0; i < amount; i++) {
			let colorGet = ('#' + Math.floor(Math.random() * 16777215).toString(16)) as ColorHex;

			// make sure it's not a forbidden color
			while (forbiddenColor.includes(colorGet)) {
				colorGet = ('#' + Math.floor(Math.random() * 16777215).toString(16)) as ColorHex;
			}

			colorList.push(colorGet);

			let seconds = i * amountDivider;
			secondsList.push(seconds);
		}
		setRandomColorList(colorList);
		setColorChangeSecondsList(secondsList.reverse());

		const saved: colorCache = {
			current: currentPt.current,
			colors: colorList,
			intervals: secondsList,
		};

		window.electron.ipcRenderer.send('save-cache-color', saved);
	};

	const check_00_fajr = () => {
		const checkNow = Moment().tz(timezone);
		const before = Moment('00:00:00', 'HH:mm:ss').tz(timezone);
		const after = Moment(new Date(currentPt.fajrTime), 'HH:mm:ss').tz(timezone);
		if (checkNow.isBetween(before, after)) {
			return true;
		} else {
			return false;
		}
	};

	const getDif = () => {
		const start = Moment(new Date(pt_Map[currentPt.current])).tz(timezone);
		const end = Moment(new Date(pt_Map[currentPt.next])).tz(timezone);
		if (currentPt.next === 'fajr' && !check_00_fajr()) end.add(1, 'day');

		const duration = Moment.duration(start.diff(end));

		return Math.abs(duration.asSeconds());
	};

	const getDifInitial = () => {
		const startInitial = Moment(new Date()).tz(timezone);
		const end = Moment(new Date(pt_Map[currentPt.next])).tz(timezone);
		if (currentPt.next === 'fajr' && !check_00_fajr()) end.add(1, 'day');

		const durationInitial = Moment.duration(startInitial.diff(end));

		return Math.ceil(Math.abs(durationInitial.asSeconds()));
	};

	const formatTimerWithHours = (time: number) => {
		let hours: string | number = Math.floor(time / 3600);
		let minutes: string | number = Math.floor((time - hours * 3600) / 60);
		let seconds: string | number = time - hours * 3600 - minutes * 60;

		if (hours < 10) hours = `0${hours}`.slice(-2);
		if (minutes < 10) minutes = `0${minutes}`.slice(-2);
		if (seconds < 10) seconds = `0${seconds}`.slice(-2);

		return `${hours}:${minutes}:${seconds}`;
	};

	const setRemainTimeFunc = () => {
		const startInitial = Moment().tz(timezone);
		const end = Moment(new Date(pt_Map[currentPt.next])).tz(timezone);
		if (currentPt.next === 'fajr' && !check_00_fajr()) end.add(1, 'day');

		const durationInitial = Moment.duration(startInitial.diff(end));

		setRemainingTime(Math.round(Math.abs(durationInitial.asSeconds())));
	};

	// --------------------------------------------------------
	// Timer
	const durationOpen = getDif();
	const durationOpenInitial = getDifInitial();
	const [remainingTime, setRemainingTime] = useState(getDifInitial());

	// ---------------------------------------------------------
	useEffect(() => {
		// Timer shown
		let timer_clock_Interval: NodeJS.Timer;
		let toExactSecond = 1000 - (new Date().getTime() % 1000);
		let timeoutTimer = setTimeout(() => {
			timer_clock_Interval = setInterval(() => {
				// update clock value
				setClockValue(new Date());
				// update timer value
				setRemainTimeFunc();
			}, 1000);

			setClockValue(new Date());
			setRemainTimeFunc();
		}, toExactSecond); // match second

		const getCacheColor = window.electron.ipcRenderer.sendSync('get-cache-color') as colorCacheGet;
		if (getCacheColor.success && getCacheColor.data.current === currentPt.current) {
			setRandomColorList(getCacheColor.data.colors);
			setColorChangeSecondsList(getCacheColor.data.intervals);
		} else {
			generateRandomHexColor(getDif() / amountDivider);
		}

		return () => {
			clearTimeout(timeoutTimer);
			clearInterval(timer_clock_Interval);
		};
	}, []);

	// ==========================================================
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
						duration={durationOpen}
						initialRemainingTime={durationOpenInitial}
						colors={randomColorList as any}
						colorsTime={colorChangeSecondsList as any}
						strokeWidth={4}
						size={290}
						onComplete={() => {
							// refresh page
							window.location.reload();
						}}
					/>
					<div className='analogue' id={theme}>
						<Clock value={clockValue} renderNumbers={true} size={250} minuteHandWidth={3} hourHandWidth={5} secondHandWidth={2} />
					</div>
				</Box>

				<Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', mt: 6 }}>
					<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
						<h3>{currentPt.current.charAt(0).toUpperCase() + currentPt.current.slice(1)}</h3>

						<p>
							{Moment(new Date(pt_Map[currentPt.current]))
								.tz(timezone)
								.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
						</p>
					</Box>

					<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ml: 6, mr: 6 }}>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								flexWrap: 'wrap',
							}}
						>
							<DoubleArrowIcon color='primary' style={{ fontSize: '26px' }} /> <h2>{formatTimerWithHours(remainingTime)}</h2>
						</div>
					</Box>

					<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
						<h3>{currentPt.next.charAt(0).toUpperCase() + currentPt.next.slice(1)}</h3>

						<p>
							{Moment(new Date(pt_Map[currentPt.next]))
								.tz(timezone)
								.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
						</p>
					</Box>
				</Box>
			</Box>
		</>
	);
};
