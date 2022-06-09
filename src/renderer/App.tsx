import './App.css';
import './Font.css';
import { configInterface } from 'main/interfaces';
import { ModalContentInterface } from 'renderer/interfaces';
import { Splashscreen, ModalPraytime, AppNav, Praytime, Settings, Schedule, About } from './components';
import { useState, useEffect, useMemo, createContext } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import Card from '@mui/material/Card';
import createTheme from '@mui/material/styles/createTheme';
import ThemeProvider from '@mui/material/styles/ThemeProvider';
import Fade from '@mui/material/Fade';

// --------------------------
const ColorModeContext = createContext({ toggleColorMode: () => {} });

// --------------------------
export default function App() {
	// --------------------------
	// theme
	const [mode, setMode] = useState<'light' | 'dark'>('light');
	const colorMode = useMemo(
		() => ({
			toggleColorMode: () => {
				setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
			},
		}),
		[]
	);

	const theme = useMemo(
		() =>
			createTheme({
				palette: {
					mode,
					...(mode === 'light'
						? {} // default colors
						: {
								background: {
									default: '#2f2f2f',
									paper: '#0b0b0b',
								},
						  }),
				},
			}),
		[mode]
	);

	// --------------------------
	// splash
	const splashShownValue = window.electron.ipcRenderer.sendSync('get-splash-shown') as boolean;
	const [showSplash, setShowSplash] = useState(!splashShownValue); // first time in session true
	const [showMenu, setShowMenu] = useState(splashShownValue); // first time in session false

	// --------------------------
	// modal
	const emptyModalContent: ModalContentInterface = {
		type: '',
		title: '',
		time: '',
		location: '',
		coordinates: '',
	};
	const [showModal, setShowModal] = useState(false);
	const [modalContent, setModalContent] = useState<ModalContentInterface>(emptyModalContent);
	const modalIPCHandler = (arg: any) => {
		setShowModal(true);
		setModalContent(arg);
		localStorage.setItem('modal-open', 'true');
	};
	const modalClosedFromMain = () => {
		setShowModal(false);
		localStorage.setItem('modal-open', 'false');
	};

	// --------------------------
	useEffect(() => {
		// splash
		window.electron.ipcRenderer.send('set-splash-shown');

		setTimeout(() => {
			setShowSplash(false);
			setShowMenu(true);
		}, 1800);

		// modal handler
		window.electron.ipcRenderer.on('signal-modal-praytime', modalIPCHandler);
		window.electron.ipcRenderer.on('close-modal', modalClosedFromMain);

		// config
		const currentConfig = window.electron.ipcRenderer.sendSync('get-config') as configInterface;
		setMode(currentConfig.theme);

		return () => {
			window.electron.ipcRenderer.removeEventListener('signal-modal-praytime', modalIPCHandler);
			window.electron.ipcRenderer.removeEventListener('close-modal', modalClosedFromMain);
		};
	}, []);

	// track setting changes made
	const [changesMade, setChangesMade] = useState<boolean>(false);

	return (
		<ColorModeContext.Provider value={colorMode}>
			<ThemeProvider theme={theme}>
				<Router>
					<Splashscreen show={showSplash} theme={mode} />
					<ModalPraytime modalContent={modalContent} showModal={showModal} setShowModal={setShowModal} />
					<Fade in={showMenu}>
						<Card sx={{ m: 1.5, backgroundColor: theme.palette.background.paper }} id={mode}>
							<AppNav theme={mode} changesMade={changesMade} />
							<Routes>
								<Route path='/' element={<Praytime theme={mode} />} />
								<Route path='/schedule' element={<Schedule />} />
								<Route path='/settings' element={<Settings appTheme={mode} ColorModeContext={ColorModeContext} changesMade={changesMade} setChangesMade={setChangesMade} />} />
								<Route path='/about' element={<About />} />
							</Routes>
						</Card>
					</Fade>
				</Router>
			</ThemeProvider>
		</ColorModeContext.Provider>
	);
}
