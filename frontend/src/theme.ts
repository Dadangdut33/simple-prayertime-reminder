import { createTheme, ThemeOptions } from '@mui/material/styles';
import type { ThemePreset } from './types';

type PresetPalette = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
};

const PRESETS: Record<ThemePreset, PresetPalette> = {
  indigo: {
    primary: '#4f64f0',
    primaryLight: '#6278f3',
    primaryDark: '#3b4cc4',
    secondary: '#e2b04a',
    secondaryLight: '#ecc471',
    secondaryDark: '#bc8f30',
  },
  emerald: {
    primary: '#158f6a',
    primaryLight: '#21aa80',
    primaryDark: '#0d6d50',
    secondary: '#d8a54a',
    secondaryLight: '#e3bd72',
    secondaryDark: '#ae7f2f',
  },
  sunset: {
    primary: '#d85c3a',
    primaryLight: '#e57a5c',
    primaryDark: '#aa4025',
    secondary: '#7a5cff',
    secondaryLight: '#9a84ff',
    secondaryDark: '#5840ca',
  },
  rose: {
    primary: '#c14f7a',
    primaryLight: '#d86b95',
    primaryDark: '#97385d',
    secondary: '#e0a43f',
    secondaryLight: '#ecc06b',
    secondaryDark: '#b57f23',
  },
  ocean: {
    primary: '#2274a5',
    primaryLight: '#4392c4',
    primaryDark: '#16557a',
    secondary: '#19a7a1',
    secondaryLight: '#43c4be',
    secondaryDark: '#0e7e79',
  },
};

const getDesignTokens = (mode: 'light' | 'dark', preset: ThemePreset): ThemeOptions => {
  const colors = PRESETS[preset];

  return {
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            primary: {
              main: colors.primary,
              light: colors.primaryLight,
              dark: colors.primaryDark,
            },
            secondary: {
              main: colors.secondary,
              light: colors.secondaryLight,
              dark: colors.secondaryDark,
            },
            background: {
              default: '#f4f6f8',
              paper: '#ffffff',
            },
            text: {
              primary: '#12141f',
              secondary: '#555870',
            },
            divider: '#e0e2e9',
          }
        : {
            primary: {
              main: colors.primaryLight,
              light: colors.primaryLight,
              dark: colors.primary,
            },
            secondary: {
              main: colors.secondaryLight,
              light: colors.secondaryLight,
              dark: colors.secondary,
            },
            background: {
              default: '#0b0d16',
              paper: '#12141f',
            },
            text: {
              primary: '#f0f2ff',
              secondary: '#8b91b5',
            },
            divider: '#2a2d42',
          }),
    },
    typography: {
      fontFamily: '"Roboto", "Segoe UI", sans-serif',
      h1: {
        fontWeight: 800,
        fontSize: 'clamp(1.9rem, 1.2rem + 1.2vw, 2.7rem)',
        lineHeight: 1.05,
        letterSpacing: '-0.04em',
      },
      h2: {
        fontWeight: 700,
        fontSize: '1.45rem',
        lineHeight: 1.15,
        letterSpacing: '-0.03em',
      },
      h3: {
        fontWeight: 700,
        fontSize: '1.125rem',
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
      },
      h6: {
        fontWeight: 700,
        letterSpacing: '-0.01em',
      },
      subtitle1: {
        fontWeight: 600,
        lineHeight: 1.35,
      },
      subtitle2: {
        fontWeight: 700,
        fontSize: '0.95rem',
        lineHeight: 1.35,
      },
      body1: {
        lineHeight: 1.6,
      },
      body2: {
        lineHeight: 1.55,
      },
      overline: {
        fontWeight: 700,
        letterSpacing: '0.12em',
      },
      button: {
        textTransform: 'none',
        fontWeight: 700,
        fontSize: '0.95rem',
        lineHeight: 1.2,
        letterSpacing: '-0.01em',
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor:
              mode === 'light' ? '#b6bccf #eef0f6' : '#3a415e #0f1322',
          },
          '*::-webkit-scrollbar': {
            width: '10px',
            height: '10px',
          },
          '*::-webkit-scrollbar-track': {
            backgroundColor: mode === 'light' ? '#eef0f6' : '#0f1322',
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: mode === 'light' ? '#b6bccf' : '#3a415e',
            borderRadius: 999,
            border: `2px solid ${mode === 'light' ? '#eef0f6' : '#0f1322'}`,
          },
          '*::-webkit-scrollbar-thumb:hover': {
            backgroundColor: mode === 'light' ? '#9ea5bd' : '#4b5374',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            minHeight: 42,
            padding: '10px 18px',
            whiteSpace: 'nowrap',
            alignItems: 'center',
            gap: 8,
          },
          containedPrimary: {
            boxShadow: mode === 'light' ? `0 10px 24px ${colors.primary}38` : `0 10px 24px ${colors.primaryLight}42`,
            '&:hover': {
              boxShadow: mode === 'light' ? `0 14px 28px ${colors.primary}47` : `0 14px 28px ${colors.primaryLight}52`,
            },
          },
          outlined: {
            borderWidth: 1,
          },
          text: {
            paddingInline: 12,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            border: `1px solid ${mode === 'light' ? '#e0e2e9' : '#2a2d42'}`,
            backgroundColor: mode === 'light' ? '#ffffff' : '#171a29',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: mode === 'light' ? '0 20px 40px rgba(17, 24, 39, 0.06)' : '0 18px 32px rgba(0, 0, 0, 0.24)',
            border: `1px solid ${mode === 'light' ? '#e0e2e9' : '#2a2d42'}`,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: 999,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 48,
            fontWeight: 700,
            textTransform: 'none',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            minHeight: 44,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: mode === 'light' ? '#e0e2e9' : '#2a2d42',
          },
          head: {
            fontWeight: 700,
          },
        },
      },
    },
  };
};

export const buildAppTheme = (mode: 'light' | 'dark', preset: ThemePreset = 'indigo') =>
  createTheme(getDesignTokens(mode, preset));
