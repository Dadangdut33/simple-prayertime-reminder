import './App.css';
import './Font.css';
import { configInterface } from 'main/handler/files';
import { AppNav, MainMenu, Calendar } from './components';
import { useState, useEffect, useMemo, createContext } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material';
import { Box } from '@mui/material';

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
				},
			}),
		[mode]
	);

	// get theme from settings
	useEffect(() => {
		const currentConfig = window.electron.ipcRenderer.sendSync('get-config') as configInterface;
		setMode(currentConfig.theme);
	}, []);

	return (
		<ColorModeContext.Provider value={colorMode}>
			<ThemeProvider theme={theme}>
				<Router>
					<Box sx={{ m: 1 }}>
						<AppNav theme={mode} />
						<Routes>
							<Route path='/' element={<MainMenu ColorModeContext={ColorModeContext} />} />
							<Route path='/calendar' element={<Calendar />} />
						</Routes>
					</Box>
				</Router>
			</ThemeProvider>
		</ColorModeContext.Provider>
	);
}
