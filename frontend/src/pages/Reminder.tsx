declare global {
  interface Window {
    wails?: {
      Events?: {
        On: (eventName: string, callback: (...args: any[]) => void) => void;
      };
    };
  }
}

import { useEffect, useState } from 'react';
import { Box, Button, Card, Typography } from '@mui/material';
import { BellRing, Bell, CheckCircle2 } from 'lucide-react';
import { dismissReminder } from '../bindings';
import type { ReminderInfo } from '../types';

export default function ReminderPage() {
  const [info, setInfo] = useState<ReminderInfo | null>(null);

  useEffect(() => {
    if (window.wails?.Events?.On) {
      window.wails.Events.On('reminder:update', (data: ReminderInfo) => {
        setInfo(data);
      });
    }

    document.body.style.background = 'transparent';

    return () => {
      document.body.style.background = '';
    };
  }, []);

  const prayerName = info?.prayerName ?? 'Prayer';
  const state = info?.state ?? 'before';
  const minutesLeft = info?.minutesLeft ?? 0;

  let icon = <Bell size={48} color="currentColor" />;
  let title = `${prayerName} is soon`;
  let subtitle = `Starts in ${minutesLeft} minutes`;

  if (state === 'ontime') {
    icon = <BellRing size={60} color="currentColor" />;
    title = `It's time for ${prayerName}`;
    subtitle = 'Prayer time has started';
  } else if (state === 'after') {
    icon = <CheckCircle2 size={52} color="currentColor" />;
    title = `${prayerName} is in progress`;
    subtitle = 'Reminder is still active';
  }

  const accentColor = state === 'ontime' ? 'secondary.main' : state === 'after' ? 'success.main' : 'primary.main';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 3,
        background: 'transparent',
      }}
    >
      <Card
        sx={{
          width: 'min(100%, 420px)',
          p: 4,
          textAlign: 'center',
          borderWidth: state === 'ontime' ? 2 : 1,
          borderColor: accentColor,
          backdropFilter: 'blur(14px)',
          backgroundColor: (theme) =>
            theme.palette.mode === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(18,20,31,0.92)',
        }}
      >
        <Box
          sx={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            mx: 'auto',
            mb: 3,
            color: accentColor,
            background: (theme) => `radial-gradient(circle, ${theme.palette.action.hover}, transparent 75%)`,
            boxShadow: state === 'ontime' ? '0 0 0 10px rgba(226,176,74,0.12), 0 0 32px rgba(226,176,74,0.25)' : 'none',
          }}
        >
          {icon}
        </Box>

        <Typography variant="h2" sx={{ color: accentColor, mb: 1 }}>
          {title}
        </Typography>

        <Typography variant="body1" color="text.secondary" mb={3}>
          {subtitle}
        </Typography>

        <Button fullWidth size="large" variant="contained" onClick={() => dismissReminder()}>
          Dismiss & Stop Audio
        </Button>
      </Card>
    </Box>
  );
}
