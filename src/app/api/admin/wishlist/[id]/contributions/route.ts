import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireWishlistAdmin } from '@/lib/auth'

// GET /api/admin/wishlist/[id]/contributions - Get contributions for an item (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireWishlistAdmin()

    const itemId = params.id

    const item = await db.wishlistItem.findUnique({
      where: { id: itemId }
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    const contributions = await db.wishlistContribution.findMany({
      where: { itemId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        title: item.title
      },
      contributions
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error fetching contributions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contributions' },
      { status: 500 }
    )
  }
}

