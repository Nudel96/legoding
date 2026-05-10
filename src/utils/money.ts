/**
 * Round a number to 2 decimal places.
 */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Parse a price string to a number. Handles comma as decimal separator.
 */
export function parsePrice(value: string | number): number {
  if (typeof value === 'number') return roundMoney(value);
  const cleaned = value.replace(/[^\d.,\-]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : roundMoney(parsed);
}

/**
 * Calculate total cost including shipping.
 */
export function calculateTotalCost(price: number, shipping: number): number {
  return roundMoney(price + shipping);
}

/**
 * Calculate margin (absolute and percentage).
 */
export function calculateMargin(
  resaleValue: number,
  totalCost: number
): { marginAbs: number; marginPct: number } {
  const marginAbs = roundMoney(resaleValue - totalCost);
  const marginPct = totalCost > 0 ? roundMoney((marginAbs / totalCost) * 100) : 0;
  return { marginAbs, marginPct };
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
