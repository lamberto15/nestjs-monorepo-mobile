import { NativeTabs } from 'expo-router/native-tabs';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useMe } from '@/features/auth/hooks';
import { applyLanguage, supportedLanguage } from '@/features/account/language';
import { useUnreadCount } from '@/features/notifications/hooks';
import { useRealtimeNotifications } from '@/features/notifications/use-realtime-notifications';

/** The signed-in app: its tabs, the realtime connection, the saved language. */
export default function AppLayout() {
  const { t, i18n } = useTranslation();
  const me = useMe();
  const unread = useUnreadCount();
  useRealtimeNotifications();

  // The language saved on the account wins over the device's.
  const saved = supportedLanguage(me.data?.user.locale);
  useEffect(() => {
    if (saved && saved !== i18n.resolvedLanguage) {
      void applyLanguage(saved);
    }
  }, [saved, i18n]);

  const count = unread.data?.unread ?? 0;
  const badge = unread.data?.unreadCapped || count > 99 ? '99+' : String(count);

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notes">
        <NativeTabs.Trigger.Label>{t('tabs.notes')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="note.text" md="description" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications">
        <NativeTabs.Trigger.Label>
          {t('tabs.notifications')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bell.fill" md="notifications" />
        {count > 0 && (
          <NativeTabs.Trigger.Badge>{badge}</NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>{t('tabs.account')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
