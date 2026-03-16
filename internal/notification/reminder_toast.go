package notification

import (
	"fmt"

	"github.com/wailsapp/wails/v3/pkg/services/notifications"
)

func (svc *Service) sendNativeNotificationLocked(info ReminderInfo, sticky bool) {
	if svc.nativeNotifSvc == nil {
		log.Warn("native notifications unavailable")
		return
	}
	allowed, err := svc.nativeNotifSvc.CheckNotificationAuthorization()
	if err != nil {
		log.Warn("native notification permission check failed", "error", err)
		return
	}
	if !allowed {
		log.Warn("native notification permission not granted")
		return
	}
	title, body := svc.buildReminderText(info)
	id := fmt.Sprintf("reminder-%d", info.TriggerID)
	if err := svc.nativeNotifSvc.SendNotification(notifications.NotificationOptions{
		ID:    id,
		Title: title,
		Body:  body,
	}); err != nil {
		log.Error("native notification send failed", "error", err)
	}
	if sticky {
		log.Info("native notification sticky requested (platform support may vary)")
	}
}

// CheckNativeNotificationPermission reports whether the OS allows notifications.
func (svc *Service) CheckNativeNotificationPermission() (bool, error) {
	if svc.nativeNotifSvc == nil {
		return false, fmt.Errorf("native notification service not available")
	}
	return svc.nativeNotifSvc.CheckNotificationAuthorization()
}

// RequestNativeNotificationPermission prompts for notification permission.
func (svc *Service) RequestNativeNotificationPermission() (bool, error) {
	if svc.nativeNotifSvc == nil {
		return false, fmt.Errorf("native notification service not available")
	}
	return svc.nativeNotifSvc.RequestNotificationAuthorization()
}
