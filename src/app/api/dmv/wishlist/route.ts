import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const [items, confirmationSums, contributionSums] = await Promise.all([
      db.wishlistItem.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      }),
      db.wishlistConfirmation.groupBy({
        by: ['itemId'],
        _sum: { quantity: true },
      }),
      db.wishlistContribution.groupBy({
        by: ['itemId'],
        _sum: { amountCents: true },
      }),
    ])

    const quantityMap = new Map(
      confirmationSums.map(({ itemId, _sum }) => [itemId, _sum.quantity ?? 0])
    )
    const contributionMap = new Map(
      contributionSums.map(({ itemId, _sum }) => [itemId, _sum.amountCents ?? 0])
    )

    const itemsWithProgress = items.map(item => {
      const quantityConfirmed = quantityMap.get(item.id) ?? 0
      const contributedCents = contributionMap.get(item.id) ?? 0
      const goalCents = item.priceCents * item.quantityNeeded
      const confirmedValueCents = quantityConfirmed * item.priceCents + contributedCents
      const remainingValueCents = Math.max(0, goalCents - confirmedValueCents)

      return {
        ...item,
        quantityConfirmed,
        contributedCents,
        goalCents,
        confirmedValueCents,
        remainingValueCents,
      }
    })

    return NextResponse.json({
      success: true,
      items: itemsWithProgress
    })
  } catch (error) {
    console.error('Error fetching wishlist items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wishlist items' },
      { status: 500 }
    )
  }
}
