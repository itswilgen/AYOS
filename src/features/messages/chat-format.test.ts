import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatMessage } from '../../types/messages'
import { groupByDay, initials, splitBookingNote } from './chat-format'

const message = (id: string, createdAt: string): ChatMessage =>
  ({ id, role: 'customer', mine: false, body: 'Hi', image: null, masked: false, hidden: false, createdAt })

describe('chat formatting', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-17T10:00:00+08:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('groups messages by Manila day with Today and Yesterday labels', () => {
    const groups = groupByDay([
      message('1', '2026-11-12T09:00:00+08:00'),
      message('2', '2026-11-16T23:30:00+08:00'),
      // 00:15 in Manila is still the 16th in UTC; it belongs to today here.
      message('3', '2026-11-17T00:15:00+08:00'),
      message('4', '2026-11-17T09:45:00+08:00'),
    ])
    expect(groups.map((group) => [group.label, group.messages.map((item) => item.id)])).toEqual([
      ['Thu, Nov 12', ['1']],
      ['Yesterday', ['2']],
      ['Today', ['3', '4']],
    ])
  })

  it('splits booking notes into a ticket number and the text', () => {
    expect(splitBookingNote('Request #10: work started.')).toEqual({ ticket: '#10', text: 'work started.' })
    expect(splitBookingNote('Hello there')).toEqual({ ticket: null, text: 'Hello there' })
  })

  it('makes initials from up to two words', () => {
    expect(initials('Jun Reyes Plumbing')).toBe('JR')
    expect(initials('  lea  ')).toBe('L')
    expect(initials('')).toBe('AY')
  })
})
