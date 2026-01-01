import { Suspense } from 'react'
import Image from 'next/image'
import { WishlistList } from '@/components/wishlist-list'

export const metadata = {
  title: 'Building Move Wish List - CCI DMV',
  description: 'Help us prepare for our new building by donating needed items. Every contribution makes a difference!',
}

export default function WishlistPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-start">
          <div className="flex items-center space-x-3">
            <Image
              src="/logo.svg"
              alt="CCI America logo"
              width={160}
              height={48}
              className="h-10 w-auto sm:h-12"
              priority
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12 space-y-3">
          <h1 className="text-4xl font-bold text-gray-900">
            We&apos;re almost there!
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            And the countdown to our first service at our new location has begun.
            Let&apos;s partner generously towards this move by giving for essential items.
          </p>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Browse this CCI DMV wish list, contribute to or purchase items, and confirm your donation.
            Every contribution gets us closer to a great worship experience.
          </p>
        </div>

        <Suspense fallback={<div className="text-center py-12">Loading wish list...</div>}>
          <WishlistList />
        </Suspense>
      </div>
    </div>
  )
}
