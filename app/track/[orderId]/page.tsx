import { BuyerTrackPackagePage } from '@/components/buyer-track-package-page'

export default async function TrackOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  return <BuyerTrackPackagePage orderId={orderId} />
}
