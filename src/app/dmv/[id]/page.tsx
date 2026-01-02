import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { WishlistItemDetail } from '@/components/wishlist-item-detail'
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

    if (!item || !item.isActive) {
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
    title: `${item.title} - CCI DMV Building Wish List`,
    description: item.description || `Help CCI DMV by donating this needed item. ${item.title} - $${(item.priceCents / 100).toFixed(2)}`,
  }
}

export default async function WishlistItemPage({ params }: PageProps) {
  const item = await getWishlistItem(params.id)

  if (!item) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Suspense fallback={<div className="text-center py-12">Loading item details...</div>}>
          <WishlistItemDetail item={item} />
        </Suspense>
      </div>
    </div>
  )
}
