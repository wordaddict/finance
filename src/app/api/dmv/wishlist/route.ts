import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const items = await db.wishlistItem.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        _count: {
          select: {
            confirmations: true
          }
        }
      }
    })

    // Calculate quantityConfirmed for each item
    const itemsWithCounts = items.map(item => ({
      ...item,
      quantityConfirmed: item._count.confirmations
    }))

    return NextResponse.json({
      success: true,
      items: itemsWithCounts
    })
  } catch (error) {
    console.error('Error fetching wishlist items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wishlist items' },
      { status: 500 }
    )
  }
}
