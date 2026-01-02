import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { WishlistContributionForm } from '@/components/wishlist-contribution-form'
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
    })

    if (!item || !item.isActive || !item.allowContributions) {
      return null
    }

    const [confirmationSum, contributionSum] = await Promise.all([
      db.wishlistConfirmation.aggregate({
        where: { itemId: id },
        _sum: { quantity: true },
      }),
      db.wishlistContribution.aggregate({
        where: { itemId: id },
        _sum: { amountCents: true },
      }),
    ])

    const confirmedQuantity = confirmationSum._sum.quantity ?? 0
    const contributedCents = contributionSum._sum.amountCents ?? 0

    const goalCents = item.priceCents * item.quantityNeeded
    const confirmedValueCents = confirmedQuantity * item.priceCents + contributedCents
    const remainingValueCents = Math.max(0, goalCents - confirmedValueCents)

    return {
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      quantityConfirmed: confirmedQuantity,
      contributedCents,
      goalCents,
      confirmedValueCents,
      remainingValueCents,
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
    title: `Contribute toward ${item.title}`,
    description: `Help fund ${item.title} on the CCI DMV building wish list.`,
  }
}

export default async function ContributePage({ params }: PageProps) {
  const item = await getWishlistItem(params.id)

  if (!item) {
    notFound()
  }

  if (item.remainingValueCents <= 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h1>
          <p className="text-gray-600 mb-6">
            This item has already been fully funded by generous donors.
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
        <Suspense fallback={<div className="text-center py-12">Loading contribution form...</div>}>
          <WishlistContributionForm item={item} />
        </Suspense>
      </div>
    </div>
  )
}

