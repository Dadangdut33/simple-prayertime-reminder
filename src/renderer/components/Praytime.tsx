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
import Fade from '@mui/material/Fade';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';

// Icons
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';

// Date parser
import Moment from 'moment-timezone';
const moment = require('moment-hijri');
moment.locale('en');

export const Praytime = ({ theme }: any) => {
	// ----------------------------------------------------------------------------------------------------------------------
	// Config
	const currentPt = window.electron.ipcRenderer.sendSync('get-this-pt') as getPrayerTimes_I;
	const timezone = window.electron.ipcRenderer.sendSync('get-timezone') as string;
	const appSettings = window.electron.ipcRenderer.sendSync('get-config') as configInterface;

	// clock
	const [clockValueNow, setClockValueNow] = useState(new Date());
	const [randomColorList, setRandomColorList] = useState<ColorHex[]>([]);
	const [colorChangeSecondsList, setColorChangeSecondsList] = useState<number[]>([]);
	const amountDivider = 75;

	// chip shrink expand
	const [chipExpanded, setChipExpanded] = useState(false);

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
			let color: ColorHex = '#';
			for (let i = 0; i < 3; i++) color += ('0' + Math.floor((Math.random() * Math.pow(16, 2)) / 2).toString(16)).slice(-2);

			colorList.push(color);
			secondsList.push(i * amountDivider);
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

	const refreshPage = () => {
		// do not refresh page if modal is open
		if (localStorage.getItem('modal-open') === 'true') return;

		// check window locatiom
		if (window.electron.ipcRenderer.sendSync('get-current-page') === '/') window.location.reload();
	};

	// ---------------------------------------------------------
	useEffect(() => {
		// get chip state from localstorage
		const chipState = localStorage.getItem('chip-state');
		if (chipState === 'true') setChipExpanded(true);

		// Timer shown
		let timer_clock_Interval: NodeJS.Timer;
		let toExactSecond = 1000 - (new Date().getTime() % 1000);
		let timeoutTimer = setTimeout(() => {
			timer_clock_Interval = setInterval(() => {
				// update clock value
				setClockValueNow(new Date());
				// update timer value
				setRemainTimeFunc();
			}, 1000);

			setClockValueNow(new Date());
			setRemainTimeFunc();
		}, toExactSecond); // match second

		const getCacheColor = window.electron.ipcRenderer.sendSync('get-cache-color') as colorCacheGet;
		if (getCacheColor.success && getCacheColor.data.current === currentPt.current) {
			setRandomColorList(getCacheColor.data.colors);
			setColorChangeSecondsList(getCacheColor.data.intervals);
		} else {
			generateRandomHexColor(getDif() / amountDivider);
		}

		// listener
		window.electron.ipcRenderer.on('refresh-from-main', refreshPage);
		return () => {
			window.electron.ipcRenderer.removeEventListener('refresh-from-main', refreshPage);
			clearTimeout(timeoutTimer);
			clearInterval(timer_clock_Interval);
		};
	}, []);

	// ---------------------------------------------------------
	// extra / show all
	const chipClick = () => {
		// save the state in local storage
		localStorage.setItem('chip-state', JSON.stringify(!chipExpanded));
		setChipExpanded(!chipExpanded);
	};

	// ==========================================================
	return (
		<>
			<CssBaseline />
			<Fade in={true}>
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
							<Clock value={clockValueNow} renderNumbers={true} size={250} minuteHandWidth={3} hourHandWidth={5} secondHandWidth={2} />
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

					<Divider style={{ width: '50%' }}>
						<Chip icon={chipExpanded ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />} onClick={chipClick} id='chip-expand' />
					</Divider>

					<Collapse in={chipExpanded}>
						<Box sx={{ display: 'flex', flexDirection: 'column', mt: 3 }}>
							<Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'start' }}>
								{Moment(clockValueNow).tz(timezone).format('dddd, D MMMM YYYY')} -{' '}
								<span className='subtle-text' style={{ marginLeft: '3px' }}>
									{appSettings.hijriCalendarOffset < 0
										? moment(clockValueNow).subtract(Math.abs(appSettings.hijriCalendarOffset), 'days').tz(timezone).format('iD iMMMM iYYYY')
										: moment(clockValueNow).add(appSettings.hijriCalendarOffset, 'days').tz(timezone).format('iD iMMMM iYYYY')}
								</span>
							</Box>
							<Stack direction='row' divider={<Divider orientation='vertical' flexItem />} spacing={2} sx={{ mt: 3, justifyContent: 'space-between' }}>
								<Box sx={{ display: 'flex', flexDirection: 'column' }}>
									<div>
										<strong>
											{Moment(new Date(currentPt.fajrTime))
												.tz(timezone)
												.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
										</strong>
										<span className={currentPt.current === 'fajr' ? 'prayername' : 'prayername subtle-text'}>Fajr</span>
									</div>
									<div>
										<strong>
											{Moment(new Date(currentPt.sunriseTime))
												.tz(timezone)
												.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
										</strong>
										<span className={currentPt.current === 'sunrise' ? 'prayername' : 'prayername subtle-text'}>Sunrise</span>
									</div>
									<div>
										<strong>
											{Moment(new Date(currentPt.dhuhrTime))
												.tz(timezone)
												.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
										</strong>
										<span className={currentPt.current === 'dhuhr' ? 'prayername' : 'prayername subtle-text'}>Dhuhr</span>
									</div>
								</Box>
								<Box sx={{ display: 'flex', flexDirection: 'column' }}>
									<div>
										<strong>
											{Moment(new Date(currentPt.asrTime))
												.tz(timezone)
												.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
										</strong>
										<span className={currentPt.current === 'asr' ? 'prayername' : 'prayername subtle-text'}>Asr</span>
									</div>
									<div>
										<strong>
											{Moment(new Date(currentPt.maghribTime))
												.tz(timezone)
												.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
										</strong>
										<span className={currentPt.current === 'maghrib' ? 'prayername' : 'prayername subtle-text'}>Maghrib</span>
									</div>
									<div>
										<strong>
											{Moment(new Date(currentPt.ishaTime))
												.tz(timezone)
												.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
										</strong>
										<span className={currentPt.current === 'isha' ? 'prayername' : 'prayername subtle-text'}>Isha</span>
									</div>
								</Box>
							</Stack>
						</Box>
					</Collapse>
				</Box>
			</Fade>
		</>
	);
};
