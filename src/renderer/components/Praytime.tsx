import winDir from '../../../assets/windir.png';
import { useState, useEffect } from 'react';
import { configInterface, getPrayerTimes_I, ColorHex, colorCache, colorCacheGet } from 'main/interfaces';
import { Timer } from './Timer';

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
import Skeleton from '@mui/material/Skeleton';

// Icons
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';

// Date parser
import Moment from 'moment-timezone';
const moment = require('moment-hijri');
moment.locale('en');

// modal
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';
const centeredModal = {
	position: 'absolute' as 'absolute',
	top: '50%',
	left: '50%',
	transform: 'translate(-50%, -50%)',
	width: '700px',
	bgcolor: 'background.paper',
	borderRadius: '4px',
	boxShadow: 24,
};

export const Praytime = ({ theme }: any) => {
	// ----------------------------------------------------------------------------------------------------------------------
	const [key, setKey] = useState(0);
	// Config
	const [currentPt, setCurrentPt] = useState<getPrayerTimes_I | null>(null);
	const [timezone, setTimezone] = useState('UTC');
	const [appSettings, setAppSettings] = useState<configInterface | null>(null);

	// clock
	const [clockValueNow, setClockValueNow] = useState<Date | null>(null);
	const [randomColorList, setRandomColorList] = useState<ColorHex[]>([]);
	const [colorChangeSecondsList, setColorChangeSecondsList] = useState<number[]>([]);

	// chip shrink expand
	const [chipExpanded, setChipExpanded] = useState(false);
	const [modalOpened, setModalOpened] = useState(false);

	// ----------------------------------------------------------------------------------------------------------------------
	const pt_Map = (key: string, currentPt: getPrayerTimes_I) => {
		const map: any = {
			fajr: currentPt.fajrTime,
			sunrise: currentPt.sunriseTime,
			dhuhr: currentPt.dhuhrTime,
			asr: currentPt.asrTime,
			maghrib: currentPt.maghribTime,
			isha: currentPt.ishaTime,
		};

		return map[key];
	};

	const check_00_fajr = (currentPt: getPrayerTimes_I) => {
		const checkNow = Moment().tz(timezone);
		const before = Moment('00:00:00', 'HH:mm:ss').tz(timezone);
		const after = Moment(new Date(currentPt!.fajrTime), 'HH:mm:ss').tz(timezone);
		return checkNow.isBetween(before, after);
	};

	const getPtDif = (currentPt: getPrayerTimes_I) => {
		const start = Moment(new Date(pt_Map(currentPt.current, currentPt))).tz(timezone);
		const end = Moment(new Date(pt_Map(currentPt.next, currentPt))).tz(timezone);
		if (currentPt!.next === 'fajr' && !check_00_fajr(currentPt)) end.add(1, 'day');

		const duration = Moment.duration(start.diff(end));
		return Math.abs(duration.asSeconds());
	};

	const getPtDif_Initial = (currentPt: getPrayerTimes_I) => {
		const startInitial = Moment(new Date()).tz(timezone);
		const end = Moment(new Date(pt_Map(currentPt.next, currentPt))).tz(timezone);
		if (currentPt!.next === 'fajr' && !check_00_fajr(currentPt)) end.add(1, 'day');

		const durationInitial = Moment.duration(startInitial.diff(end));
		return Math.ceil(Math.abs(durationInitial.asSeconds()));
	};

	// wind direction to word
	const windDirectionToWord = (direction: number) => {
		const directions = ['N', 'N/NE', 'NE', 'E/NE', 'E', 'E/SE', 'SE', 'S/SE', 'S', 'S/SW', 'SW', 'W/SW', 'W', 'W/NW', 'NW', 'N/NW', 'N'];
		return directions[Math.round((direction % 360) / 22.5)];
	};

	// --------------------------------------------------------
	// Timer
	const [timerClock_duration, setTimeClockDuration] = useState<number>(2000);
	const [timeClock_timeDif, setTimeClockTimeDif] = useState<number>(0);
	const updatePTData_RefreshTimer = () => {
		const lcl_cPt = window.electron.ipcRenderer.sendSync('get-this-pt') as getPrayerTimes_I;
		setCurrentPt(lcl_cPt);
		setTimeClockDuration(getPtDif(lcl_cPt));
		setTimeClockTimeDif(getPtDif_Initial(lcl_cPt));
		setKey((prevKey) => prevKey + 1); // refresh timer
	};

	// ---------------------------------------------------------
	useEffect(() => {
		const lcl_cPt = window.electron.ipcRenderer.sendSync('get-this-pt') as getPrayerTimes_I;
		const amountDivider = 75;
		setTimezone(window.electron.ipcRenderer.sendSync('get-timezone') as string);
		setAppSettings(window.electron.ipcRenderer.sendSync('get-config') as configInterface);
		setCurrentPt(lcl_cPt);
		setTimeClockDuration(getPtDif(lcl_cPt));
		setTimeClockTimeDif(getPtDif_Initial(lcl_cPt));
		setKey((prevKey) => prevKey + 1); // refresh timer

		// get chip state from localstorage
		const chipState = localStorage.getItem('chip-state');
		if (chipState === 'true') setChipExpanded(true);

		// timer
		let toExactSecond = 1000 - (new Date().getTime() % 1000),
			timeoutTimer = setTimeout(() => {
				setClockValueNow(new Date());
			}, toExactSecond); // match second

		// timer color
		const getCacheColor = window.electron.ipcRenderer.sendSync('get-cache-color') as colorCacheGet;
		if (getCacheColor.success && getCacheColor.data.current === lcl_cPt.current && getCacheColor.data.colors.length > 0 && getCacheColor.data.intervals.length > 0) {
			setRandomColorList(getCacheColor.data.colors);
			setColorChangeSecondsList(getCacheColor.data.intervals);
		} else {
			let colorList: ColorHex[] = [],
				secondsList: number[] = [];
			for (let i = 0; i < getPtDif(lcl_cPt) / amountDivider; i++) {
				let color: ColorHex = '#';
				for (let i = 0; i < 3; i++) color += ('0' + Math.floor((Math.random() * Math.pow(16, 2)) / 2).toString(16)).slice(-2);

				colorList.push(color);
				secondsList.push(i * amountDivider);
			}

			setRandomColorList(colorList);
			setColorChangeSecondsList(secondsList.reverse());

			const saved: colorCache = {
				current: lcl_cPt.current,
				colors: colorList,
				intervals: secondsList,
			};

			window.electron.ipcRenderer.send('save-cache-color', saved);
		}

		// listener
		window.electron.ipcRenderer.on('refresh-from-main', updatePTData_RefreshTimer);
		return () => {
			window.electron.ipcRenderer.removeEventListener('refresh-from-main', updatePTData_RefreshTimer);
			clearTimeout(timeoutTimer);
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
			<Modal open={modalOpened}>
				<Box sx={centeredModal}>
					<img src={winDir} alt='compass guide' style={{ width: 700 }} />
					<Box sx={{ display: 'flex', flexDirection: 'column' }}>
						<Typography sx={{ fontWeight: 'bold', ml: 'auto', mr: 'auto' }} variant='h5' component='h2'>
							Wind Direction
						</Typography>
						{currentPt ? (
							<Typography sx={{ ml: 'auto', mr: 'auto' }} variant='subtitle1' component='h5'>
								{currentPt.qibla.toFixed(2)}° ({windDirectionToWord(currentPt.qibla)})
							</Typography>
						) : (
							<Skeleton width={100} />
						)}
					</Box>
					<Button
						sx={{
							width: 700,
							borderRadius: 0,
						}}
						variant='contained'
						onClick={() => setModalOpened(!modalOpened)}
					>
						Ok
					</Button>
				</Box>
			</Modal>
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
							{appSettings ? (
								<h2>
									{appSettings.locationOption.city} ({appSettings.locationOption.latitude}, {appSettings.locationOption.longitude})
								</h2>
							) : (
								<Skeleton width={100} />
							)}
						</div>
					</Box>

					<Box id='the-clock' className={theme + '-clock'} sx={{ mt: clockValueNow ? 3 : 0.6, mb: clockValueNow ? 3 : 0.6 }}>
						{clockValueNow ? (
							<>
								<CountdownCircleTimer
									key={key}
									isPlaying
									duration={timerClock_duration}
									initialRemainingTime={timeClock_timeDif}
									colors={randomColorList as any}
									colorsTime={colorChangeSecondsList as any}
									strokeWidth={4}
									size={290}
									onComplete={() => {
										updatePTData_RefreshTimer();
									}}
								/>
								<div className='analogue' id={theme}>
									<Clock key={key} value={clockValueNow} renderNumbers={true} size={250} minuteHandWidth={3} hourHandWidth={5} secondHandWidth={2} />
								</div>
							</>
						) : (
							<Skeleton variant='circular' width={275} height={275} />
						)}
					</Box>

					<Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', mt: 6 }}>
						<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
							{currentPt && appSettings ? (
								<>
									<h3>{currentPt.current.charAt(0).toUpperCase() + currentPt.current.slice(1)}</h3>
									<p>
										{Moment(new Date(pt_Map(currentPt.current, currentPt)))
											.tz(timezone)
											.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
									</p>
								</>
							) : (
								<Skeleton width={100} />
							)}
						</Box>

						{clockValueNow ? <Timer key={key} initialTime={timeClock_timeDif} setClockValueNow={setClockValueNow} /> : <Skeleton width={175} sx={{ marginLeft: '20px', marginRight: '20px' }} />}

						<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
							{currentPt && appSettings ? (
								<>
									<h3>{currentPt.next.charAt(0).toUpperCase() + currentPt.next.slice(1)}</h3>

									<p>
										{Moment(new Date(pt_Map(currentPt.next, currentPt)))
											.tz(timezone)
											.format(appSettings.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A')}
									</p>
								</>
							) : (
								<Skeleton width={100} />
							)}
						</Box>
					</Box>

					<Divider style={{ width: '50%' }}>
						<Chip icon={chipExpanded ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />} onClick={chipClick} id='chip-expand' />
					</Divider>

					<Collapse in={chipExpanded}>
						<Box sx={{ display: 'flex', flexDirection: 'column', mt: 3 }}>
							<Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'start' }}>
								{appSettings && clockValueNow ? (
									<>
										{Moment(clockValueNow).tz(timezone).format('dddd, D MMMM YYYY')} -{' '}
										<span className='subtle-text' style={{ marginLeft: '3px' }}>
											{appSettings.hijriCalendarOffset < 0
												? moment(clockValueNow).subtract(Math.abs(appSettings.hijriCalendarOffset), 'days').tz(timezone).format('iD iMMMM iYYYY')
												: moment(clockValueNow).add(appSettings.hijriCalendarOffset, 'days').tz(timezone).format('iD iMMMM iYYYY')}
										</span>
									</>
								) : (
									<Skeleton width={100} />
								)}
							</Box>
							<Stack direction='row' divider={<Divider orientation='vertical' flexItem />} spacing={2} sx={{ mt: 3, justifyContent: 'space-between' }}>
								{currentPt && appSettings ? (
									<>
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
									</>
								) : (
									<Skeleton width={100} />
								)}
							</Stack>
							<Box sx={{ display: 'flex', direction: 'row', pt: 3 }}>
								Qibla direction :
								{currentPt ? (
									<span onClick={() => setModalOpened(!modalOpened)} className='qibla-span' style={{ paddingLeft: '6px' }}>
										{currentPt.qibla.toFixed(2)}° ({windDirectionToWord(currentPt.qibla)})
									</span>
								) : (
									<Skeleton width={100} />
								)}
							</Box>
						</Box>
					</Collapse>
				</Box>
			</Fade>
		</>
	);
};
