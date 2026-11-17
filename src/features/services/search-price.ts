import type { ProviderSummary } from '../../types/marketplace'
import { lowestPrice } from '../../lib/format/peso'

/** The matched service's price; the lowest one only when no service matched. Never another service's price. */
export function priceFor(provider: Pick<ProviderSummary, 'matchedService' | 'startingPrices'>): number | null {
  return provider.matchedService ? provider.startingPrices[provider.matchedService] ?? null : lowestPrice(provider.startingPrices)
}
