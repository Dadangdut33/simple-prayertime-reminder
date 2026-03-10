import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Card, Tab, Tabs } from '@mui/material';
import GeneralSettingsTab from '../components/pages/settings/GeneralSettingsTab';
import LocationSettingsTab from '../components/pages/settings/LocationSettingsTab';
import PrayerSettingsTab from '../components/pages/settings/PrayerSettingsTab';
import AlarmSettingsTab from '../components/pages/settings/AlarmSettingsTab';
import ResetSettingsDialog from '../components/pages/settings/ResetSettingsDialog';
import SettingsHeader from '../components/pages/settings/SettingsHeader';
import { useAppStore } from '../store/appStore';
import type { Settings } from '../types';
import { formatDigitalClock } from '../utils/helpers';
import { useTranslation } from 'react-i18next';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { settings, updateSettings, resetSettings, detectLocation, loading } = useAppStore();
  const [activeTab, setActiveTab] = useState(0);
  const [local, setLocal] = useState(settings);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const skipNextAutosave = useRef(false);

  useEffect(() => {
    if (!settings) return;
    skipNextAutosave.current = true;
    setLocal(settings);
    setSaveState('idle');
  }, [settings]);

  const settingsKey = useMemo(() => (settings ? JSON.stringify(settings) : ''), [settings]);
  const localKey = useMemo(() => (local ? JSON.stringify(local) : ''), [local]);

  useEffect(() => {
    if (!local || !settings) return;

    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }

    if (localKey === settingsKey) return;

    setSaveState('saving');
    const timeout = window.setTimeout(async () => {
      try {
        await updateSettings(local);
        setSaveState('saved');
      } catch (error) {
        console.error(error);
        setSaveState('error');
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [local, localKey, settings, settingsKey, updateSettings]);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const timeout = window.setTimeout(() => setSaveState('idle'), 1400);
    return () => window.clearTimeout(timeout);
  }, [saveState]);

  if (!local) return null;

  const clockFormatPreview = formatDigitalClock(
    new Date(),
    local.dashboard.digitalClockFormat,
    local.dashboard.digitalClockCustom,
  );

  const saveLabel =
    saveState === 'saving'
      ? t('common.saving')
      : saveState === 'saved'
        ? t('common.saved')
        : saveState === 'error'
          ? t('common.saveFailed')
          : '';

  const replaceLocal = (next: Settings) => setLocal(next);

  const setLocation = (patch: Partial<Settings['location']>) =>
    replaceLocal({
      ...local,
      location: { ...local.location, ...patch },
    });

  const setPrayer = (patch: Partial<Settings['prayer']>) =>
    replaceLocal({
      ...local,
      prayer: { ...local.prayer, ...patch },
    });

  const setNotification = (patch: Partial<Settings['notification']>) =>
    replaceLocal({
      ...local,
      notification: { ...local.notification, ...patch },
    });

  const setDashboard = (patch: Partial<Settings['dashboard']>) =>
    replaceLocal({
      ...local,
      dashboard: { ...local.dashboard, ...patch },
    });

  return (
    <Box p={4} mx="auto">
      <SettingsHeader saveLabel={saveLabel} saveState={saveState} onReset={() => setResetDialogOpen(true)} />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
          <Tab label={t('settings.tabs.general')} />
          <Tab label={t('settings.tabs.location')} />
          <Tab label={t('settings.tabs.prayer')} />
          <Tab label={t('settings.tabs.alarms')} />
        </Tabs>
      </Box>

      <Card sx={{ p: 4, borderRadius: 0.5 }}>
        {activeTab === 0 && (
          <GeneralSettingsTab
            local={local}
            setLocal={replaceLocal}
            setDashboard={setDashboard}
            clockFormatPreview={clockFormatPreview}
          />
        )}

        {activeTab === 1 && (
          <LocationSettingsTab
            local={local}
            loading={loading}
            detectLocation={detectLocation}
            setLocation={setLocation}
          />
        )}

        {activeTab === 2 && <PrayerSettingsTab local={local} setPrayer={setPrayer} />}

        {activeTab === 3 && <AlarmSettingsTab local={local} setNotification={setNotification} />}
      </Card>

      <ResetSettingsDialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirm={async () => {
          await resetSettings();
          setResetDialogOpen(false);
        }}
      />
    </Box>
  );
}
