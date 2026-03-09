import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UpdateIcon from '@mui/icons-material/Update';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import ComputerOutlinedIcon from '@mui/icons-material/ComputerOutlined';
import Package2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import packageJson from '../../package.json';
import * as api from '../bindings';
import type { AppInfo, UpdateInfo } from '../types';

type LatestReleaseState = {
  status: 'idle' | 'checking' | 'success' | 'error';
  update?: UpdateInfo;
  message?: string;
};

export default function AboutPage() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestRelease, setLatestRelease] = useState<LatestReleaseState>({
    status: 'idle',
  });

  useEffect(() => {
    let active = true;

    async function loadAppInfo() {
      try {
        const info = await api.getAppInfo();
        if (!active) return;
        setAppInfo(info);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAppInfo();

    return () => {
      active = false;
    };
  }, []);

  const currentVersion = appInfo?.version || packageJson.version;
  const latestSummary = useMemo(() => {
    if (latestRelease.status !== 'success' || !latestRelease.update) {
      return null;
    }

    if (!latestRelease.update.hasUpdate) {
      return `You are already on the latest version (${latestRelease.update.latestVersion}).`;
    }

    return `Latest available version: ${latestRelease.update.latestVersion}`;
  }, [latestRelease]);

  async function handleCheckLatestVersion() {
    setLatestRelease({ status: 'checking' });

    try {
      const update = await api.checkForUpdates();
      setLatestRelease({
        status: 'success',
        update,
      });
    } catch (err) {
      setLatestRelease({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleOpenRepository() {
    if (!appInfo?.repositoryUrl) return;
    await api.openURL(appInfo.repositoryUrl);
  }

  async function handleOpenConfigLocation() {
    await api.openConfigLocation();
  }

  async function handleOpenLatestRelease() {
    if (!latestRelease.update?.releaseUrl) return;
    await api.openURL(latestRelease.update.releaseUrl);
  }

  return (
    <Box p={4}>
      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 0.5,
              display: 'grid',
              placeItems: 'center',
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}26)`,
              color: 'primary.main',
            }}
          >
            <InfoOutlinedIcon fontSize="small" />
          </Box>
          <Typography variant="h2">About</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          About this app
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : appInfo ? (
        <Stack spacing={3}>
          <Card
            sx={{
              p: 4,
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.background.paper}, ${theme.palette.action.hover})`,
            }}
          >
            <Typography variant="h1">Simple Prayertime Reminder</Typography>
            <Typography variant="overline" mt={1} mb={2} color="text.secondary">
              A simple muslim desktop companion
            </Typography>
          </Card>

          <Box display="grid" gridTemplateColumns={{ xs: '1fr', xl: '1fr 1fr' }} gap={3}>
            <Card sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={1.25} mb={2}>
                <UpdateIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1">Version</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" mb={1}>
                Installed version
              </Typography>
              <Typography variant="h2" color="primary.main" mb={2}>
                {currentVersion}
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  variant="outlined"
                  startIcon={latestRelease.status === 'checking' ? <CircularProgress size={16} /> : <UpdateIcon />}
                  onClick={handleCheckLatestVersion}
                  disabled={latestRelease.status === 'checking'}
                >
                  Check Latest Version
                </Button>

                {latestRelease.update?.releaseUrl && (
                  <Button variant="text" startIcon={<OpenInNewIcon />} onClick={handleOpenLatestRelease}>
                    {latestRelease.update.actionLabel || 'Open Latest Release'}
                  </Button>
                )}
              </Stack>

              {latestSummary && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {latestSummary}
                </Alert>
              )}
              {latestRelease.status === 'error' && latestRelease.message && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  {latestRelease.message}
                </Alert>
              )}
            </Card>

            <Card sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={1.25} mb={2}>
                <ComputerOutlinedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1">Environment</Typography>
              </Box>

              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Detected OS
                  </Typography>
                  <Typography variant="h3">{appInfo.detectedOs}</Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Installation method
                  </Typography>
                  <Typography variant="h3">{appInfo.installMethod}</Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Executable path
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {appInfo.executablePath}
                  </Typography>
                </Box>
              </Stack>
            </Card>

            <Card sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={1.25} mb={2}>
                <Package2OutlinedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1">Repository</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" mb={1}>
                Source code
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace', mb: 2 }}>
                {appInfo.repositoryUrl}
              </Typography>
              <Button variant="contained" startIcon={<OpenInNewIcon />} onClick={handleOpenRepository}>
                Open Repository
              </Button>
            </Card>

            <Card sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={1.25} mb={2}>
                <FolderOpenOutlinedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1">Config Location</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" mb={1}>
                Config directory
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace', mb: 2 }}>
                {appInfo.configDirectory}
              </Typography>

              <Typography variant="body2" color="text.secondary" mb={1}>
                Config file
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace', mb: 2.5 }}>
                {appInfo.configFile}
              </Typography>

              <Button variant="contained" startIcon={<FolderOpenOutlinedIcon />} onClick={handleOpenConfigLocation}>
                Open Config Location
              </Button>
            </Card>
          </Box>
        </Stack>
      ) : null}
    </Box>
  );
}
