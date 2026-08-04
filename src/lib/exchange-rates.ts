export type Rates = { USD: number; EUR: number }; // PHP → X multipliers

const FALLBACK_RATES: Rates = { USD: 0.0175, EUR: 0.016 }; // approximate, update periodically

export async function getExchangeRates(): Promise<Rates> {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=PHP&to=USD,EUR", {
      next: { revalidate: 21600 }, // 6 hours
    });
    if (!res.ok) return FALLBACK_RATES;
    const data = await res.json();
    if (typeof data?.rates?.USD !== "number" || typeof data?.rates?.EUR !== "number") {
      return FALLBACK_RATES;
    }
    return { USD: data.rates.USD, EUR: data.rates.EUR };
  } catch {
    return FALLBACK_RATES;
  }
}
