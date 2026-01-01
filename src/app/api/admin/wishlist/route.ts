import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

interface CreateWishlistItemRequest {
  title: string
  description?: string | null
  category?: string | null
  priceCents: number
  currency?: string
  quantityNeeded: number
  purchaseUrl: string
  imageUrl?: string | null
  priority?: number
  isActive?: boolean
}

// GET /api/admin/wishlist - List all wishlist items (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check admin role
    await requireRole(['ADMIN'])

    const items = await db.wishlistItem.findMany({
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

// POST /api/admin/wishlist - Create new wishlist item (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check admin role
    await requireRole(['ADMIN'])

    const body: CreateWishlistItemRequest = await request.json()

    // Validate required fields
    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!body.purchaseUrl?.trim()) {
      return NextResponse.json(
        { error: 'Purchase URL is required' },
        { status: 400 }
      )
    }

    if (!body.priceCents || body.priceCents <= 0) {
      return NextResponse.json(
        { error: 'Valid price is required' },
        { status: 400 }
      )
    }

    if (!body.quantityNeeded || body.quantityNeeded <= 0) {
      return NextResponse.json(
        { error: 'Valid quantity needed is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(body.purchaseUrl)
    } catch {
      return NextResponse.json(
        { error: 'Purchase URL must be a valid URL' },
        { status: 400 }
      )
    }

    if (body.imageUrl) {
      try {
        new URL(body.imageUrl)
      } catch {
        return NextResponse.json(
          { error: 'Image URL must be a valid URL' },
          { status: 400 }
        )
      }
    }

    // Create the item
    const item = await db.wishlistItem.create({
      data: {
        title: body.title.trim(),
        description: body.description?.trim() || null,
        category: body.category?.trim() || null,
        priceCents: body.priceCents,
        currency: body.currency || 'USD',
        quantityNeeded: body.quantityNeeded,
        purchaseUrl: body.purchaseUrl.trim(),
        imageUrl: body.imageUrl?.trim() || null,
        priority: body.priority || 1,
        isActive: body.isActive !== false, // Default to true
      },
    })

    return NextResponse.json({
      success: true,
      item
    })
  } catch (error) {
    console.error('Error creating wishlist item:', error)
    return NextResponse.json(
      { error: 'Failed to create wishlist item' },
      { status: 500 }
    )
  }
}
