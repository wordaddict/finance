import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

// GET /api/admin/wishlist/[id]/confirmations - Get confirmations for an item (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin role
    await requireRole(['ADMIN'])

    const itemId = params.id

    // Check if item exists
    const item = await db.wishlistItem.findUnique({
      where: { id: itemId }
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Get confirmations
    const confirmations = await db.wishlistConfirmation.findMany({
      where: { itemId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        title: item.title
      },
      confirmations
    })
  } catch (error) {
    console.error('Error fetching confirmations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch confirmations' },
      { status: 500 }
    )
  }
}
