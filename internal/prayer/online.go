package prayer

import "time"

// Manual adjustments are deliberately separate from downloaded daily corrections.
func calculationKey(cfg PrayerConfig) PrayerConfig {
	cfg.Offsets = PrayerOffsets{}
	cfg.AutoOffsetEnabled = false
	return cfg
}

// SetOnlineSchedules installs an immutable snapshot only for the expected location
// and calculation settings. Callers must not modify schedules after this call.
func (svc *Service) SetOnlineSchedules(expected PrayerConfig, schedules map[string]DaySchedule) bool {
	svc.mu.Lock()
	defer svc.mu.Unlock()
	if !svc.cfg.AutoOffsetEnabled || calculationKey(svc.cfg) != calculationKey(expected) {
		return false
	}
	svc.online = schedules
	return true
}

func (svc *Service) ClearOnlineSchedules() {
	svc.mu.Lock()
	svc.online = nil
	svc.mu.Unlock()
}

func (svc *Service) applyOnline(local DaySchedule) DaySchedule {
	svc.mu.RLock()
	defer svc.mu.RUnlock()
	if !svc.cfg.AutoOffsetEnabled {
		return local
	}
	day, ok := svc.online[local.Date]
	if !ok {
		return local
	}
	// Applying (online - unadjusted local) is equivalent to online + manual.
	// Never reuse today's correction for another date or accumulate it on resync.
	o := svc.cfg.Offsets
	day.Fajr = day.Fajr.Add(minutes(o.Fajr))
	day.Sunrise = day.Sunrise.Add(minutes(o.Sunrise))
	day.Zuhr = day.Zuhr.Add(minutes(o.Zuhr))
	day.Asr = day.Asr.Add(minutes(o.Asr))
	day.Maghrib = day.Maghrib.Add(minutes(o.Maghrib))
	day.Isha = day.Isha.Add(minutes(o.Isha))
	return day
}

func minutes(value float64) time.Duration {
	return time.Duration(value * float64(time.Minute))
}
