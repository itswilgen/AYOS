/**
 * Reads a time from the API. The database keeps times in UTC without a zone ("2026-11-17 01:00:00"), and
 * `new Date()` would read that as local time (8 hours off in Manila). Values that already carry a zone pass through.
 */
export function apiTime(value: string): Date {
  const hasZone = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(value)
  const hasClock = /\d{2}:\d{2}/.test(value)
  return new Date(hasZone || !hasClock ? value : `${value.replace(' ', 'T')}Z`)
}
