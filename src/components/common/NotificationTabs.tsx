import { NOTIFICATION_TABS, type NotificationTab } from '../../lib/notifications/notification-tabs'
import './notification-tabs.css'

type Props = {
  active: NotificationTab
  unread: Set<NotificationTab>
  onChange: (tab: NotificationTab) => void
  /** Smaller buttons for the header's notification menu. */
  compact?: boolean
}

/** All / Requests / Inbox / Notice. A red dot marks every tab that holds something unread. */
export default function NotificationTabs({ active, unread, onChange, compact = false }: Props) {
  return <div className={`notice-tabs${compact ? ' is-compact' : ''}`} role="group" aria-label="Show notifications">
    {NOTIFICATION_TABS.map((tab) => <button key={tab.id} type="button" className="notice-tab" aria-pressed={active === tab.id} onClick={() => onChange(tab.id)}>
      {tab.label}
      {unread.has(tab.id) && <span className="notice-tab-dot"><span className="sr-only">, unread</span></span>}
    </button>)}
  </div>
}
