import { describe, expect, it } from 'vitest'
import { fromPrice, lowestPrice, peso } from './peso'

describe('peso formatting', () => {
  it('writes whole pesos with thousands separators', () => {
    expect(peso(650)).toBe('₱650')
    expect(peso(1500)).toBe('₱1,500')
    expect(peso(500000)).toBe('₱500,000')
    expect(fromPrice(1200)).toBe('From ₱1,200')
  })

  it('finds the lowest starting price, or none', () => {
    expect(lowestPrice({ Plumbing: 650, Carpentry: 400 })).toBe(400)
    expect(lowestPrice({})).toBeNull()
  })
})
