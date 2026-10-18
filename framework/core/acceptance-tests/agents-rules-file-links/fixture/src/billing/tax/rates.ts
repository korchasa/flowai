/** VAT rates by ISO country code, as a fraction of the net amount. */
export const VAT_RATES: Record<string, number> = {
  BG: 0.2,
  DE: 0.19,
  FR: 0.2,
  PL: 0.23,
};

export function vatRate(country: string): number {
  const rate = VAT_RATES[country];
  if (rate === undefined) throw new Error(`no VAT rate for ${country}`);
  return rate;
}
