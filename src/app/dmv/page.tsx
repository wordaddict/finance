import { Suspense } from 'react'
import { WishlistList } from '@/components/wishlist-list'

export const metadata = {
  title: 'Building Move Wish List - CCI DMV',
  description: 'Help us prepare for our new building by donating needed items. Every contribution makes a difference!',
}

export default function WishlistPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Building Move Wish List
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Help CCI DMV prepare for our new building by donating needed items.
            Browse our wish list, purchase items, and confirm your donation.
            Every contribution makes a difference in our community!
          </p>
        </div>

        <Suspense fallback={<div className="text-center py-12">Loading wish list...</div>}>
          <WishlistList />
        </Suspense>
      </div>
    </div>
  )
}
