import { describe, expect, it } from 'vitest'
import { priceFor } from './search-price'

const prices = { Plumbing: 650, Carpentry: 400 }

describe('priceFor (search cards)', () => {
  it('shows the price of the service the search matched', () => {
    // "plumber" maps to Plumbing on the server; the card must still find the price.
    expect(priceFor({ matchedService: 'Plumbing', startingPrices: prices })).toBe(650)
  })

  it('never shows another service’s price when the matched one has none', () => {
    expect(priceFor({ matchedService: 'Solar', startingPrices: prices })).toBeNull()
  })

  it('shows the lowest price when no service matched (no search, or a name search)', () => {
    expect(priceFor({ matchedService: null, startingPrices: prices })).toBe(400)
    expect(priceFor({ matchedService: null, startingPrices: {} })).toBeNull()
  })
})
