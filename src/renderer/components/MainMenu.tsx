import { useState, useEffect } from 'react';
// @ts-ignore
import Clock from 'react-clock';
import 'react-clock/dist/Clock.css';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';

// MUI elements
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';

export const MainMenu = ({ theme }: any) => {
	const [value, setValue] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => setValue(new Date()), 1000);

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
				<Box id='the-clock' className={theme + '-clock'} sx={{ mt: 3 }}>
					<CountdownCircleTimer isPlaying duration={7} colors={['#004777', '#F7B801', '#A30000', '#A30000']} colorsTime={[6, 4, 3, 0]} strokeWidth={4} size={290} />
					<div className='analogue' id={theme}>
						<Clock value={value} renderNumbers={true} size={250} minuteHandWidth={3} hourHandWidth={5} secondHandWidth={2} />
					</div>
				</Box>

				<Box sx={{ mt: 6 }}>tes</Box>
			</Box>
		</>
	);
};
