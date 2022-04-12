import './App.css';
import './Font.css';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { MainMenu, Calendar } from './components';
import { useState, useEffect, useMemo, createContext } from 'react';
import { createTheme, ThemeProvider } from '@mui/material';

const ColorModeContext = createContext({ toggleColorMode: () => {} });
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

	return (
		<ColorModeContext.Provider value={colorMode}>
			<ThemeProvider theme={theme}>
				<Router>
					<Routes>
						<Route path='/' element={<MainMenu ColorModeContext={ColorModeContext} />} />
						<Route path='/calendar' element={<Calendar />} />
					</Routes>
				</Router>
			</ThemeProvider>
		</ColorModeContext.Provider>
	);
}
