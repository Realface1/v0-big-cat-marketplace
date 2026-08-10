export function formatNaira(amount: number) {
  const value = Number.isFinite(Number(amount)) ? Number(amount) : 0

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value)
}
