'use client';

/**
 * The service worker and the morning notification on this device (ALWAYS_ON_SPEC 6.2–6.3).
 * The server holds one subscription per browser; Settings switches it on and off here.
 */
import axiosInstance from '@/lib/utils/axios';

export type PushState = 'unsupported' | 'blocked' | 'off' | 'on';

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

function keyBytes(base64url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function pushState(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

/** Asks for permission, subscribes this browser and tells the server. Returns the new state. */
export async function enablePush(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  const status = (await axiosInstance.get('/api/push/status')).data?.data as { publicKey: string | null } | undefined;
  if (!status?.publicKey) throw new Error('Notifications are not set up on the server yet.');
  const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(status.publicKey) as BufferSource }));
  await axiosInstance.post('/api/push/subscription', sub.toJSON());
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await axiosInstance.delete('/api/push/subscription', { data: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe();
  }
  return 'off';
}

export async function sendTestPush(): Promise<{ sent: number }> {
  return (await axiosInstance.post('/api/push/test')).data?.data ?? { sent: 0 };
}
