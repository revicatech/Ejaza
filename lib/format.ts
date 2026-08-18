const arabicNumber = new Intl.NumberFormat("ar-SY-u-nu-arab");

/** Formats a number with Arabic-Indic numerals (١٢٣) instead of hardcoding them. */
export function formatArabicNumber(n: number): string {
  return arabicNumber.format(n);
}

/** e.g. formatPrice(140000, "ل.س") -> "١٤٠٬٠٠٠ ل.س / الليلة" */
export function formatPrice(amount: number, currency: string): string {
  return `${arabicNumber.format(amount)} ${currency} / الليلة`;
}
