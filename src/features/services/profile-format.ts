/** API times are UTC, either ISO or `Y-m-d H:i:s`. */
const parse = (value: string) => new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)

export const monthYear = (value: string) => parse(value).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
