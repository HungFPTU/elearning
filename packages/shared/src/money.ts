const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

/** Format an integer VND amount for display, e.g. 499000 -> "499.000 ₫". */
export function formatVnd(amount: number): string {
  return vndFormatter.format(amount);
}
