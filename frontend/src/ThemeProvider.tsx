import { useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import { useAppStore } from './store/appStore';
import { buildAppTheme } from './theme';
import type { ThemePreset } from './types';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const settings = useAppStore((state) => state.settings);

  // Detect system preference
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = useMemo(() => {
    const themeSetting = settings?.theme || 'system';
    const themePreset = settings?.themePreset || 'indigo';
    const resolvedMode: 'light' | 'dark' =
      themeSetting === 'system' ? (prefersDarkMode ? 'dark' : 'light') : themeSetting === 'dark' ? 'dark' : 'light';

    return buildAppTheme(resolvedMode, themePreset as ThemePreset);
  }, [settings?.theme, settings?.themePreset, prefersDarkMode]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
