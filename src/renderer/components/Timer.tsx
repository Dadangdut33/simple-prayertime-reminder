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

	useEffect(() => {
		setTimeToStr(initialTime - 1);
		// timer
		let timer_clock_interval: NodeJS.Timer,
			toExactSecond = 1000 - (new Date().getTime() % 1000),
			timeoutTimer = setTimeout(() => {
				timer_clock_interval = setInterval(() => {
					setTimeToStr((prevTimeToStr) => prevTimeToStr - 1); // update timer value by substracting it
				}, 1000);
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
