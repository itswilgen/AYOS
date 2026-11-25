/** Notification tabs: every notification is a request update, a message, or an AYOS notice (set by the server). */
export type NotificationCategory = 'request' | 'inbox' | 'notice'
export type NotificationTab = 'all' | NotificationCategory

export const NOTIFICATION_TABS: { id: NotificationTab; label: string; empty: string }[] = [
  { id: 'all', label: 'All', empty: 'Updates about your requests, messages and AYOS will show up here.' },
  { id: 'request', label: 'Requests', empty: 'No request updates yet. New requests, visits and finished jobs show up here.' },
  { id: 'inbox', label: 'Inbox', empty: 'No message updates yet. New messages from your conversations show up here.' },
  { id: 'notice', label: 'Notice', empty: 'No notices yet. AYOS updates and account news show up here.' },
]

/** The notifications a tab shows. Anything without a category counts as a notice. */
export function inTab<T extends { category?: NotificationCategory | null }>(items: T[], tab: NotificationTab): T[] {
  return tab === 'all' ? items : items.filter((item) => (item.category ?? 'notice') === tab)
}

/** Which tabs hold something unread (for their red dot). "All" has one whenever any tab does. */
export function unreadTabs<T extends { category?: NotificationCategory | null }>(items: T[], isUnread: (item: T) => boolean): Set<NotificationTab> {
  const tabs = new Set<NotificationTab>()
  for (const item of items) {
    if (!isUnread(item)) continue
    tabs.add('all')
    tabs.add(item.category ?? 'notice')
  }
  return tabs
}
