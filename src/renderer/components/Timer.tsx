import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow';

export const Timer = ({ initialTime }: { initialTime: number }) => {
	const [timeToStr, setTimeToStr] = useState<number>(0);

	const formatTimerWithHours = (time: number) => {
		let hours: string | number = Math.floor(time / 3600);
		let minutes: string | number = Math.floor((time - hours * 3600) / 60);
		let seconds: string | number = time - hours * 3600 - minutes * 60;

		if (hours < 10) hours = `0${hours}`.slice(-2);
		if (minutes < 10) minutes = `0${minutes}`.slice(-2);
		if (seconds < 10) seconds = `0${seconds}`.slice(-2);

		return `${hours}:${minutes}:${seconds}`;
	};

	// function to verify if seconds left is accurate
	const getAccurateSeconds = (time: number) => {
		// get the seconds only
		const fullTime = formatTimerWithHours(time);
		const seconds = fullTime.split(':')[2];

		// compare with date now
		const now = new Date();
		const nowSeconds = 60 - now.getSeconds();

		// get the dif between seconds now and the seconds in the timer
		let dif = Math.abs(nowSeconds - parseInt(seconds));
		if (parseInt(seconds) < 6) dif = 1; // this is a little hack for 0-5 it gonna return wrong stuff so just set dif to 1

		return dif;
	};

	useEffect(() => {
		// timer
		let timer_clock_interval: NodeJS.Timer,
			toExactSecond = 1000 - (new Date().getTime() % 1000),
			validateCounter = 0,
			timeoutTimer = setTimeout(() => {
				timer_clock_interval = setInterval(() => {
					setTimeToStr((prevTimeToStr) => prevTimeToStr - 1); // update timer value by substracting it
					validateCounter++;
					// validate every 15 seconds
					if (validateCounter > 14) {
						setTimeToStr((prevTimeToStr) => prevTimeToStr - getAccurateSeconds(prevTimeToStr));
						validateCounter = 0;
					}
				}, 1000);
				setTimeToStr(initialTime - getAccurateSeconds(initialTime));
			}, toExactSecond); // match second

		return () => {
			clearInterval(timer_clock_interval);
			clearTimeout(timeoutTimer);
		};
	}, []);

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ml: 6, mr: 6 }}>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					flexWrap: 'wrap',
				}}
			>
				<DoubleArrowIcon color='primary' style={{ fontSize: '26px' }} /> <h2>{formatTimerWithHours(timeToStr)}</h2>
			</div>
		</Box>
	);
};
