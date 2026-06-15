export interface CurrencyInfo {
  code: string;
  symbol: string;
  label: string;
  locale: string;
  suffix?: boolean;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "HUF", symbol: "Ft", label: "HUF (Ft)", locale: "hu-HU", suffix: true },
  { code: "USD", symbol: "$", label: "USD ($)", locale: "en-US" },
  { code: "EUR", symbol: "€", label: "EUR (€)", locale: "de-DE" },
  { code: "GBP", symbol: "£", label: "GBP (£)", locale: "en-GB" },
  { code: "CAD", symbol: "C$", label: "CAD (C$)", locale: "en-CA" },
  { code: "AUD", symbol: "A$", label: "AUD (A$)", locale: "en-AU" },
  { code: "CHF", symbol: "CHF", label: "CHF", locale: "de-CH" },
  { code: "PLN", symbol: "zł", label: "PLN (zł)", locale: "pl-PL", suffix: true },
  { code: "RON", symbol: "lei", label: "RON (lei)", locale: "ro-RO", suffix: true },
];

export function getCurrencyInfo(code: string = "HUF"): CurrencyInfo {
  return CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase()) || {
    code: code.toUpperCase(),
    symbol: code,
    label: code,
    locale: "en-US",
  };
}

export function formatAmount(amount: number, currencyCode: string = "HUF"): string {
  const currency = getCurrencyInfo(currencyCode);
  const isZeroDecimal = currency.code === "HUF" || currency.code === "JPY";
  const fractionDigits = isZeroDecimal ? 0 : 2;

  try {
    return new Intl.NumberFormat(currency.locale, {
      style: "currency",
      currency: currency.code,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch (e) {
    const formattedNum = amount.toFixed(fractionDigits);
    if (currency.suffix) {
      return `${formattedNum} ${currency.symbol}`;
    }
    return `${currency.symbol}${formattedNum}`;
  }
}
