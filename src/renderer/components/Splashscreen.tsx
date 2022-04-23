import CssBaseline from '@mui/material/CssBaseline';
import icon from '../../../assets/display_icon.png';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import Skeleton from '@mui/material/Skeleton';

export const Splashscreen = ({ show, theme }: any) => {
	return (
		<>
			<CssBaseline />
			<Fade in={show}>
				<Box
					sx={{
						position: 'absolute',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						width: '100%',
						height: '100%',
					}}
				>
					<Box
						sx={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<img className='splash-img' id={theme} style={{ marginTop: '7rem' }} src={icon} alt='logo' />
						<Box sx={{ width: '400px', mt: 2 }}>
							<Skeleton animation='wave' />
						</Box>
					</Box>
				</Box>
			</Fade>
		</>
	);
};
