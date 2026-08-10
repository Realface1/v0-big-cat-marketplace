// Delivery fee calculation utilities (client-side)

interface DeliveryFeeParams {
  weight: number
  deliveryType: 'normal' | 'express' | 'pickup'
  location: string
}

// Calculate delivery fee based on weight and delivery type
export function calculateDeliveryFee({ weight, deliveryType, location }: DeliveryFeeParams): number {
  if (deliveryType === 'pickup') {
    return 0
  }

  // Base fees
  const baseFee = deliveryType === 'express' ? 2500 : 1000 // Naira
  
  // Weight-based fee (per kg)
  const weightFee = Math.ceil(weight) * (deliveryType === 'express' ? 300 : 150)
  
  // Location-based fee (simplified - can be expanded)
  let locationFee = 500 // Default
  const lowerLocation = location.toLowerCase()
  if (lowerLocation.includes('lagos') || lowerLocation.includes('abuja')) {
    locationFee = 500
  } else if (lowerLocation.includes('port harcourt') || lowerLocation.includes('ibadan')) {
    locationFee = 800
  } else {
    locationFee = 1200 // Other locations
  }
  
  return baseFee + weightFee + locationFee
}
