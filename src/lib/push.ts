import { pushApi } from './api'

/** VAPID public keys are URL-safe base64; the PushManager needs a Uint8Array. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

/** True when this device currently has an active push subscription. */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') return false
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}

/** Register the service worker (idempotent). Safe to call on every app load. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch (err) {
    console.error('Service worker registration failed:', err)
    return null
  }
}

/** Create a push subscription for this device and store it on the backend. */
async function createSubscription(): Promise<boolean> {
  const registration = await navigator.serviceWorker.ready
  const { publicKey } = await pushApi.getVapidKey()

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  })

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys) return false

  await pushApi.subscribe({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh as string, auth: json.keys.auth as string },
  })
  return true
}

/**
 * Prompt for notification permission (if needed) and subscribe.
 * Returns true when the device is subscribed.
 */
export async function enablePushNotifications(): Promise<boolean> {
  if (!isPushSupported()) return false
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false
  try {
    return await createSubscription()
  } catch (err) {
    console.error('Failed to subscribe to push:', err)
    return false
  }
}

/**
 * If permission was already granted, silently ensure a subscription exists
 * (e.g. after login on a new session). Does not prompt.
 */
export async function ensurePushSubscription(): Promise<void> {
  if (!isPushSupported() || Notification.permission !== 'granted') return
  try {
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    if (existing) {
      const json = existing.toJSON()
      if (json.endpoint && json.keys) {
        await pushApi.subscribe({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh as string, auth: json.keys.auth as string },
        })
      }
    } else {
      await createSubscription()
    }
  } catch (err) {
    console.error('Failed to ensure push subscription:', err)
  }
}

/** Remove this device's subscription (both browser + backend). */
export async function disablePushNotifications(): Promise<void> {
  if (!isPushSupported()) return
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()
      await pushApi.unsubscribe(endpoint)
    }
  } catch (err) {
    console.error('Failed to disable push:', err)
  }
}
