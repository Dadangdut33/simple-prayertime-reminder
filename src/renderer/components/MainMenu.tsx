import icon from '../../../assets/display_icon.png';

// MUI elements
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';

export const MainMenu = () => {
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
