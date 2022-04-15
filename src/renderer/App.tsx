import './App.css';
import './Font.css';
import { configInterface } from 'main/interfaces';
import { AppNav, MainMenu, Settings, Calendar, About } from './components';
import { useState, useEffect, useMemo, createContext } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import Card from '@mui/material/Card';
import createTheme from '@mui/material/styles/createTheme';
import ThemeProvider from '@mui/material/styles/ThemeProvider';

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

	// get theme from settings, on app start
	useEffect(() => {
		const currentConfig = window.electron.ipcRenderer.sendSync('get-config') as configInterface;
		setMode(currentConfig.theme);
	}, []);

	// track setting changes made
	const [changesMade, setChangesMade] = useState<boolean>(false);

	return (
		<ColorModeContext.Provider value={colorMode}>
			<ThemeProvider theme={theme}>
				<Router>
					<Card sx={{ m: 1.5, backgroundColor: theme.palette.background.paper }} id={mode}>
						<AppNav theme={mode} changesMade={changesMade} />
						<Routes>
							<Route path='/' element={<MainMenu />} />
							<Route path='/calendar' element={<Calendar />} />
							<Route path='/settings' element={<Settings ColorModeContext={ColorModeContext} changesMade={changesMade} setChangesMade={setChangesMade} />} />
							<Route path='/about' element={<About />} />
						</Routes>
					</Card>
				</Router>
			</ThemeProvider>
		</ColorModeContext.Provider>
	);
}
