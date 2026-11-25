import { describe, expect, it } from 'vitest'
import { inTab, unreadTabs, type NotificationCategory } from './notification-tabs'

const note = (id: string, category: NotificationCategory, unread = false) => ({ id, category, unread })
const notes = [note('1', 'request', true), note('2', 'inbox'), note('3', 'notice', true), note('4', 'request')]

describe('notification tabs', () => {
  it('shows everything under All and only its own kind under each tab', () => {
    expect(inTab(notes, 'all').map((item) => item.id)).toEqual(['1', '2', '3', '4'])
    expect(inTab(notes, 'request').map((item) => item.id)).toEqual(['1', '4'])
    expect(inTab(notes, 'inbox').map((item) => item.id)).toEqual(['2'])
    expect(inTab(notes, 'notice').map((item) => item.id)).toEqual(['3'])
  })

  it('puts a red dot only on tabs with something unread, and on All when any tab has one', () => {
    expect([...unreadTabs(notes, (item) => item.unread)].sort()).toEqual(['all', 'notice', 'request'])
    expect(unreadTabs(notes.map((item) => ({ ...item, unread: false })), (item) => item.unread).size).toBe(0)
  })

  it('treats a notification without a category as a notice', () => {
    const old = [{ id: '9', category: null, unread: true }]
    expect(inTab(old, 'notice')).toHaveLength(1)
    expect([...unreadTabs(old, (item) => item.unread)].sort()).toEqual(['all', 'notice'])
  })
})
