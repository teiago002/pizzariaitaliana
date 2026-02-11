import { useEffect, useRef, useCallback } from 'react';

export function usePushNotifications() {
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const permissionRef = useRef<NotificationPermission>('default');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return;

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      swRegistrationRef.current = registration;
      permissionRef.current = Notification.permission;
    }).catch((err) => {
      console.error('SW registration failed:', err);
    });
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    permissionRef.current = permission;
    return permission === 'granted';
  }, []);

  const showNotification = useCallback((title: string, body: string, url?: string) => {
    if (swRegistrationRef.current && permissionRef.current === 'granted') {
      swRegistrationRef.current.showNotification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'new-order-' + Date.now(),
        data: { url: url || '/admin/pedidos' },
      } as NotificationOptions);
      return;
    }

    if (permissionRef.current === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'new-order',
      });
      notification.onclick = () => {
        window.focus();
        if (url) window.location.href = url;
      };
    }
  }, []);

  return {
    requestPermission,
    showNotification,
    permission: permissionRef.current,
    isSupported: 'Notification' in window,
  };
}
