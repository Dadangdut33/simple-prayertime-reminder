import icon from '../../../assets/display_icon.png';
import { ColorModeContextInterface } from 'renderer/interfaces';
import { useContext } from 'react';
import useTheme from '@mui/material/styles/useTheme';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import IconButton from '@mui/material/IconButton';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

export const MainMenu = ({ ColorModeContext }: any) => {
	const theme = useTheme();
	const colorMode = useContext(ColorModeContext) as ColorModeContextInterface;

	const testIpc = () => {
		const testPing = window.electron.ipcRenderer.sendSync('test-sync', 'bruh');
		console.log('outside ipc', testPing);
	};

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
					color: 'text.primary',
					borderRadius: 1,
					p: 3,
				}}
			>
				<div className='Hello'>
					<img width='200px' alt='icon' src={icon} />
				</div>
				<h1>electron-react-boilerplate</h1>
				{theme.palette.mode} mode
				<IconButton sx={{ ml: 1 }} onClick={colorMode.toggleColorMode} color='inherit'>
					{theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
				</IconButton>
				<div className='Hello'>
					<a href='/#' onClick={() => testIpc()}>
						<button type='button'>
							<span role='img' aria-label='books'>
								📚
							</span>
							Test
						</button>
					</a>
					<a href='https://electron-react-boilerplate.js.org/' target='_blank' rel='noreferrer'>
						<button type='button'>
							<span role='img' aria-label='books'>
								📚
							</span>
							Read our docs
						</button>
					</a>
					<a href='https://github.com/sponsors/electron-react-boilerplate' target='_blank' rel='noreferrer'>
						<button type='button'>
							<span role='img' aria-label='books'>
								🙏
							</span>
							Donate
						</button>
					</a>
				</div>
			</Box>
		</>
	);
};
