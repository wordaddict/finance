import { Suspense } from 'react'
import { ThankYouMessage } from '@/components/thank-you-message'

interface PageProps {
  params: {
    id: string
  }
}

export const metadata = {
  title: 'Thank You - CCI DMV Building Wish List',
  description: 'Thank you for your generous donation to CCI DMV!',
}

export default function ThankYouPage({ params }: PageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
          <ThankYouMessage itemId={params.id} />
        </Suspense>
      </div>
    </div>
  )
}
