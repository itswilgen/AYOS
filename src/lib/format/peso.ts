/** "₱1,500" — whole pesos, the way prices are stored. */
export const peso = (amount: number) => `₱${amount.toLocaleString('en-PH')}`

/** The price guide label: "From ₱1,500". */
export const fromPrice = (amount: number) => `From ${peso(amount)}`

/** The lowest starting price among a provider's services, or null when none is set. */
export function lowestPrice(prices: Record<string, number>): number | null {
  const values = Object.values(prices)
  return values.length ? Math.min(...values) : null
}
