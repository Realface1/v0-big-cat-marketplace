export type BusinessScale = 'Nano' | 'Mini' | 'Medium' | 'Large Scale'

const SCALE_BANDS = [
  { label: 'Nano' as const, min: 0, max: 100000 },
  { label: 'Mini' as const, min: 100000, max: 1000000 },
  { label: 'Medium' as const, min: 1000000, max: 10000000 },
  { label: 'Large Scale' as const, min: 10000000, max: Number.POSITIVE_INFINITY },
]

export function getBusinessScale(totalSales: number): BusinessScale {
  const safeSales = Number.isFinite(Number(totalSales)) ? Number(totalSales) : 0
  const band = SCALE_BANDS.find((item) => safeSales >= item.min && safeSales < item.max)
  return band?.label || 'Nano'
}

export function getNextBusinessScale(totalSales: number): BusinessScale | null {
  const safeSales = Number.isFinite(Number(totalSales)) ? Number(totalSales) : 0
  const currentIndex = SCALE_BANDS.findIndex((item) => safeSales >= item.min && safeSales < item.max)
  if (currentIndex < 0 || currentIndex >= SCALE_BANDS.length - 1) return null
  return SCALE_BANDS[currentIndex + 1].label
}

export function getBusinessScaleProgress(totalSales: number) {
  const safeSales = Number.isFinite(Number(totalSales)) ? Number(totalSales) : 0
  const band = SCALE_BANDS.find((item) => safeSales >= item.min && safeSales < item.max) || SCALE_BANDS[0]

  if (!Number.isFinite(band.max)) {
    return {
      current: band.label,
      next: null,
      progressPercent: 100,
      amountToNext: 0,
    }
  }

  const span = Math.max(1, band.max - band.min)
  const progressPercent = Math.min(100, Math.max(0, ((safeSales - band.min) / span) * 100))

  return {
    current: band.label,
    next: getNextBusinessScale(safeSales),
    progressPercent: Number(progressPercent.toFixed(1)),
    amountToNext: Math.max(0, band.max - safeSales),
  }
}
