/**
 * Local notifications: no server and no push. They're shown by the page (through the service
 * worker when there is one, so phones accept them) while the app is open in a tab or installed.
 */

export type NotifyPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function notifyPermission(): NotifyPermission {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

export async function askToNotify(): Promise<NotifyPermission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.requestPermission();
}

export type LocalNotice = { tag: string; title: string; body: string; url: string };

/** Shows one notification. A click brings the app forward at `url`. */
export async function showNotice(notice: LocalNotice, onOpen: (url: string) => void): Promise<boolean> {
  if (notifyPermission() !== 'granted') return false;
  const options: NotificationOptions = { body: notice.body, tag: notice.tag, icon: '/pwa-192.png', badge: '/pwa-192.png', data: { url: notice.url } };
  const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (registration) {
    // public/notification-click.js opens the app at data.url.
    await registration.showNotification(notice.title, options);
    return true;
  }
  const shown = new Notification(notice.title, options);
  shown.onclick = () => {
    window.focus();
    onOpen(notice.url);
    shown.close();
  };
  return true;
}
