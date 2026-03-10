import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from './store/appStore';
import * as api from './bindings';
import UpdateAvailableDialog from './components/app/UpdateAvailableDialog';
import type { UpdateInfo } from './types';
import { useTranslation } from 'react-i18next';

import {
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  CircularProgress,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import DashboardIcon from '@mui/icons-material/Dashboard';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PublicIcon from '@mui/icons-material/Public';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import appLogo from '../../assets/icons/icon.png';

const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED_WIDTH = 78;

const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.dashboard', icon: DashboardIcon, end: true },
  { to: '/prayer-times', labelKey: 'nav.prayerTimes', icon: AccessTimeIcon },
  { to: '/world-cities', labelKey: 'nav.worldCities', icon: PublicIcon },
  { to: '/quran', labelKey: 'nav.quran', icon: MenuBookIcon },
  { to: '/settings', labelKey: 'nav.settings', icon: SettingsIcon },
  { to: '/about', labelKey: 'nav.about', icon: InfoOutlinedIcon },
];

export default function App() {
  const { t } = useTranslation();
  const { initialize, loading, initialized, settings } = useAppStore();
  const location = useLocation();
  const theme = useTheme();
  const shouldAutoCollapse = useMediaQuery(theme.breakpoints.down('lg'));
  const [drawerCollapsed, setDrawerCollapsed] = useState(shouldAutoCollapse);
  const [startupUpdateInfo, setStartupUpdateInfo] = useState<UpdateInfo | null>(null);
  const [startupUpdateCheckDone, setStartupUpdateCheckDone] = useState(false);

  // Reminder window lives on its own route with no sidebar
  const isReminder = location.pathname === '/reminder';

  useEffect(() => {
    if (!initialized) initialize();
  }, [initialize, initialized]);

  useEffect(() => {
    setDrawerCollapsed(shouldAutoCollapse);
  }, [shouldAutoCollapse]);

  useEffect(() => {
    if (!initialized || !settings || startupUpdateCheckDone || !settings.autoCheckUpdates) {
      return;
    }

    let active = true;
    setStartupUpdateCheckDone(true);

    async function checkForUpdates() {
      try {
        const update = await api.checkForUpdates();
        if (!active || !update.hasUpdate) {
          return;
        }

        setStartupUpdateInfo(update);
      } catch {
        // Silent failure: startup update checks should not interrupt app launch.
      }
    }

    void checkForUpdates();

    return () => {
      active = false;
    };
  }, [initialized, settings, startupUpdateCheckDone]);

  if (isReminder) {
    return <Outlet />;
  }

  if (loading && !initialized) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
        <CircularProgress color="primary" sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          {t('app.loading')}
        </Typography>
      </Box>
    );
  }

  const drawerWidth = drawerCollapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {startupUpdateInfo ? (
        <UpdateAvailableDialog
          open
          update={startupUpdateInfo}
          onClose={() => setStartupUpdateInfo(null)}
          onOpenAction={async () => {
            await api.openURL(startupUpdateInfo.releaseUrl);
          }}
        />
      ) : null}

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid',
            borderColor: 'divider',
            background: 'var(--mui-palette-background-paper)',
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
              duration: theme.transitions.duration.shorter,
            }),
          },
        }}
      >
        <Box
          sx={{
            p: drawerCollapsed ? 1.5 : 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: drawerCollapsed ? 'center' : 'space-between',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 1,
                display: 'grid',
                placeItems: 'center',
                p: 0.5,
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.92)' : 'rgba(18,20,31,0.06)',
                border: '1px solid',
                borderColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.16)' : theme.palette.divider,
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark' ? '0 10px 24px rgba(0,0,0,0.22)' : '0 8px 18px rgba(18,20,31,0.08)',
                flexShrink: 0,
              }}
            >
              <Box
                component="img"
                src={appLogo}
                alt={t('app.name')}
                sx={{
                  width: 28,
                  height: 28,
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </Box>
            {!drawerCollapsed && (
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" lineHeight={1.2}>
                  {t('app.name')}
                </Typography>
              </Box>
            )}
          </Box>

          {!drawerCollapsed && (
            <Tooltip title={t('app.sidebar.collapse')}>
              <IconButton size="small" onClick={() => setDrawerCollapsed(true)} sx={{ flexShrink: 0 }}>
                <KeyboardDoubleArrowLeftIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        <List sx={{ px: drawerCollapsed ? 1 : 2 }}>
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon, end }) => {
            const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
            const label = t(labelKey);
            return (
              <ListItem key={to} disablePadding sx={{ mb: 0.5 }}>
                <Tooltip title={drawerCollapsed ? label : ''} placement="right">
                  <ListItemButton
                    component={NavLink}
                    to={to}
                    sx={{
                      minHeight: 44,
                      px: drawerCollapsed ? 1.25 : 1.5,
                      justifyContent: drawerCollapsed ? 'center' : 'flex-start',
                      borderRadius: 0.5,
                      ...(isActive && {
                        bgcolor: 'action.selected',
                        color: 'primary.main',
                        boxShadow: '0 0 12px rgba(79, 100, 240, 0.15)',
                      }),
                      '&:hover': {
                        bgcolor: isActive ? 'action.selected' : 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: drawerCollapsed ? 0 : 40,
                        mr: drawerCollapsed ? 0 : 1,
                        justifyContent: 'center',
                        color: isActive ? 'primary.main' : 'text.secondary',
                      }}
                    >
                      <Icon fontSize="small" />
                    </ListItemIcon>
                    {!drawerCollapsed && (
                      <ListItemText
                        primary={label}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? 'primary.main' : 'text.secondary',
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>

        {drawerCollapsed && (
          <Box sx={{ mt: 'auto', p: 1.5, display: 'flex', justifyContent: 'center' }}>
            <Tooltip title={t('app.sidebar.expand')} placement="right">
              <IconButton size="small" onClick={() => setDrawerCollapsed(false)}>
                <KeyboardDoubleArrowRightIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          overflow: 'auto',
          height: '100vh',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
