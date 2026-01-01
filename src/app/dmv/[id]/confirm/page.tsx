import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { WishlistConfirmationForm } from '@/components/wishlist-confirmation-form'
import { db } from '@/lib/db'

interface PageProps {
  params: {
    id: string
  }
}

async function getWishlistItem(id: string) {
  try {
    const item = await db.wishlistItem.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            confirmations: true
          }
        }
      }
    })

    if (!item || !item.isActive) {
      return null
    }

    const { _count, ...rest } = item

    return {
      ...rest,
      createdAt: rest.createdAt.toISOString(),
      updatedAt: rest.updatedAt.toISOString(),
      quantityConfirmed: _count.confirmations
    }
  } catch (error) {
    console.error('Error fetching wishlist item:', error)
    return null
  }
}

export async function generateMetadata({ params }: PageProps) {
  const item = await getWishlistItem(params.id)

  if (!item) {
    return {
      title: 'Item Not Found - CCI DMV Wish List'
    }
  }

  return {
    title: `Confirm Donation - ${item.title}`,
    description: `Confirm your donation of ${item.title} to CCI DMV's building wish list.`,
  }
}

export default async function ConfirmDonationPage({ params }: PageProps) {
  const item = await getWishlistItem(params.id)

  if (!item) {
    notFound()
  }

  const remaining = Math.max(0, item.quantityNeeded - item.quantityConfirmed)

  if (remaining <= 0) {
    // Item is already fulfilled, redirect to thank you page
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h1>
          <p className="text-gray-600 mb-6">
            This item has already been fulfilled by generous donors like you.
            Your willingness to help means the world to our community!
          </p>
          <a
            href="/dmv"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            See Other Items That Need Help
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Suspense fallback={<div className="text-center py-12">Loading confirmation form...</div>}>
          <WishlistConfirmationForm item={item} maxQuantity={remaining} />
        </Suspense>
      </div>
    </div>
  )
}
