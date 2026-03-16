import type { ReactNode } from 'react';
import { Box, Button, Card, Tooltip, Typography } from '@mui/material';
import { BellRing, Bell, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { WindowState } from '../../types';
import type { SxProps, Theme } from '@mui/material/styles';

interface ReminderWindowProps {
  prayerLabel: string;
  state: WindowState;
  beforeMinutes: number;
  afterMinutes: number;
  hoverDetail?: string | null;
  autoDismissSecondsLeft?: number | null;
  autoDismissAfterAdhan?: boolean;
  extra?: ReactNode;
  debug?: ReactNode;
  onDismiss?: () => void | Promise<void>;
  dismissLabel?: string;
  cardSx?: SxProps<Theme>;
}

export default function ReminderWindow({
  prayerLabel,
  state,
  beforeMinutes,
  afterMinutes,
  hoverDetail,
  autoDismissSecondsLeft,
  autoDismissAfterAdhan,
  extra,
  debug,
  onDismiss,
  dismissLabel,
  cardSx,
}: ReminderWindowProps) {
  const { t } = useTranslation();
  let icon = <Bell size={48} color="currentColor" />;
  let title = t('reminder.beforeTitle', { prayer: prayerLabel, minutes: beforeMinutes });
  let subtitle = t('reminder.soonTitle', { prayer: prayerLabel });

  if (state === 'ontime') {
    icon = <BellRing size={60} color="currentColor" />;
    title = t('reminder.timeTitle', { prayer: prayerLabel });
    subtitle = t('reminder.started');
  } else if (state === 'after') {
    icon = <CheckCircle2 size={52} color="currentColor" />;
    title = t('reminder.afterTitle', { prayer: prayerLabel, minutes: afterMinutes });
    subtitle = t('reminder.active');
  }

  const accentColor = state === 'ontime' ? 'secondary.main' : state === 'after' ? 'success.main' : 'primary.main';
  const iconNode = (
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
  );
  const titleNode = (
    <Typography variant="h2" sx={{ color: accentColor, mb: 1 }}>
      {title}
    </Typography>
  );
  const tooltipProps = hoverDetail
    ? {
        title: hoverDetail,
        placement: 'top' as const,
        arrow: true,
      }
    : null;

  return (
    <Card
      sx={{
        width: '100%',
        height: '100%',
        textAlign: 'center',
        borderRadius: 0,
        ...cardSx,
      }}
    >
      <Box
        sx={{
          p: 4,
          backdropFilter: 'blur(14px)',
        }}
      >
        {tooltipProps ? <Tooltip {...tooltipProps}>{iconNode}</Tooltip> : iconNode}

        {tooltipProps ? <Tooltip {...tooltipProps}>{titleNode}</Tooltip> : titleNode}

        <Typography variant="body1" color="text.secondary" mb={3}>
          {subtitle}
        </Typography>
        {state === 'after' && (
          <Box
            sx={{
              mb: 3,
              px: 2,
              py: 1.5,
              borderLeft: '3px solid',
              borderColor: 'success.main',
              bgcolor: 'action.hover',
              textAlign: 'left',
            }}
          >
            <Typography
              variant="body2"
              className="flex flex-col"
              sx={{ mb: 1, whiteSpace: 'pre-line', fontStyle: 'italic' }}
            >
              {t('reminder.afterQuoteBefore')}
              <Typography sx={{ fontWeight: 700, my: 1, fontStyle: 'normal', mx: 'auto' }}>
                {t('reminder.afterQuoteEmphasis')}
              </Typography>
              {t('reminder.afterQuoteAfter')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('reminder.afterReference')}
            </Typography>
          </Box>
        )}
        {autoDismissSecondsLeft !== null && autoDismissSecondsLeft !== undefined && (
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            {t('reminder.autoDismissIn', { seconds: autoDismissSecondsLeft })}
          </Typography>
        )}
        {(autoDismissSecondsLeft === null || autoDismissSecondsLeft === undefined) && autoDismissAfterAdhan && (
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            {t('reminder.autoDismissAfterAdhan')}
          </Typography>
        )}
        {/* {extra} */}
        {/* {debug} */}
        {onDismiss && (
          <Button fullWidth size="large" variant="contained" onClick={onDismiss}>
            {dismissLabel ?? t('reminder.dismiss')}
          </Button>
        )}
      </Box>
    </Card>
  );
}
