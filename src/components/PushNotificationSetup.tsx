import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import {
  isPushSupported,
  notificationPermission,
  enablePushNotifications,
  ensurePushSubscription,
} from '@/lib/push'

const DISMISS_KEY = 'push-prompt-dismissed'

/**
 * Shows a one-time banner asking the user to enable push notifications so they get
 * clock-in reminders / management alerts on their phone or computer. If permission was
 * already granted, it silently re-registers the device subscription and renders nothing.
 */
const PushNotificationSetup: React.FC = () => {
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isPushSupported()) return
    const permission = notificationPermission()

    if (permission === 'granted') {
      // Already allowed — make sure this device has a live subscription on the server.
      ensurePushSubscription()
      return
    }

    // Prompt only if the user hasn't been asked/dismissed before.
    if (permission === 'default' && localStorage.getItem(DISMISS_KEY) !== 'true') {
      setVisible(true)
    }
  }, [])

  const handleEnable = async () => {
    setBusy(true)
    const ok = await enablePushNotifications()
    setBusy(false)
    if (ok) {
      toast.success('Notifications enabled')
      setVisible(false)
    } else {
      toast.error('Could not enable notifications')
      // If the user blocked it, don't keep nagging.
      if (notificationPermission() === 'denied') dismiss()
    }
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-primary/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <BellIcon className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm">
          Enable notifications to get clock-in reminders and alerts on this device.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" loading={busy} onClick={handleEnable}>
          Enable
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded p-1 text-muted-foreground hover:bg-muted"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default PushNotificationSetup
