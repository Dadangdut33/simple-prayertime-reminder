import './App.css';
import './Font.css';
import { configInterface } from 'main/interfaces';
import { Splashscreen, AppNav, Praytime, Settings, Schedule, About } from './components';
import { useState, useEffect, useMemo, createContext } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import Card from '@mui/material/Card';
import createTheme from '@mui/material/styles/createTheme';
import ThemeProvider from '@mui/material/styles/ThemeProvider';
import Slide from '@mui/material/Slide';

// --------------------------
const ColorModeContext = createContext({ toggleColorMode: () => {} });

// --------------------------
export default function App() {
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

	const [showSplash, setShowSplash] = useState(true);
	const [showMenu, setShowMenu] = useState(false);
	// get theme from settings, on app start
	useEffect(() => {
		const currentConfig = window.electron.ipcRenderer.sendSync('get-config') as configInterface;
		setMode(currentConfig.theme);

		setTimeout(() => {
			setShowSplash(false);
			setShowMenu(true);
		}, 1800);
	}, []);

	// track setting changes made
	const [changesMade, setChangesMade] = useState<boolean>(false);

	return (
		<ColorModeContext.Provider value={colorMode}>
			<ThemeProvider theme={theme}>
				<Router>
					<Splashscreen show={showSplash} theme={mode} />
					<Slide in={showMenu} direction='down'>
						<Card sx={{ m: 1.5, backgroundColor: theme.palette.background.paper }} id={mode}>
							<AppNav theme={mode} changesMade={changesMade} />
							<Routes>
								<Route path='/' element={<Praytime theme={mode} />} />
								<Route path='/schedule' element={<Schedule />} />
								<Route path='/settings' element={<Settings appTheme={mode} ColorModeContext={ColorModeContext} changesMade={changesMade} setChangesMade={setChangesMade} />} />
								<Route path='/about' element={<About />} />
							</Routes>
						</Card>
					</Slide>
				</Router>
			</ThemeProvider>
		</ColorModeContext.Provider>
	);
}
