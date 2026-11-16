import { apiTime as parse } from '../../lib/time/api-time'

export const monthYear = (value: string) => parse(value).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
