import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireWishlistAdmin } from '@/lib/auth'

interface UpdateWishlistItemRequest {
  title?: string
  description?: string | null
  category?: string | null
  priceCents?: number
  currency?: string
  quantityNeeded?: number
  purchaseUrl?: string
  imageUrl?: string | null
  priority?: number
  isActive?: boolean
}

// PUT /api/admin/wishlist/[id] - Update wishlist item (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Restrict to specific wishlist admin user
    await requireWishlistAdmin()

    const itemId = params.id
    const body: UpdateWishlistItemRequest = await request.json()

    // Check if item exists
    const existingItem = await db.wishlistItem.findUnique({
      where: { id: itemId }
    })

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Validate fields if provided
    if (body.title !== undefined && !body.title?.trim()) {
      return NextResponse.json(
        { error: 'Title cannot be empty' },
        { status: 400 }
      )
    }

    if (body.purchaseUrl !== undefined && !body.purchaseUrl?.trim()) {
      return NextResponse.json(
        { error: 'Purchase URL cannot be empty' },
        { status: 400 }
      )
    }

    if (body.purchaseUrl) {
      try {
        new URL(body.purchaseUrl)
      } catch {
        return NextResponse.json(
          { error: 'Purchase URL must be a valid URL' },
          { status: 400 }
        )
      }
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

    if (body.priceCents !== undefined && (body.priceCents <= 0 || !Number.isInteger(body.priceCents))) {
      return NextResponse.json(
        { error: 'Price must be a positive integer (cents)' },
        { status: 400 }
      )
    }

    if (body.quantityNeeded !== undefined && (body.quantityNeeded <= 0 || !Number.isInteger(body.quantityNeeded))) {
      return NextResponse.json(
        { error: 'Quantity needed must be a positive integer' },
        { status: 400 }
      )
    }

    // Update the item
    const updatedItem = await db.wishlistItem.update({
      where: { id: itemId },
      data: {
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.category !== undefined && { category: body.category?.trim() || null }),
        ...(body.priceCents !== undefined && { priceCents: body.priceCents }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.quantityNeeded !== undefined && { quantityNeeded: body.quantityNeeded }),
        ...(body.purchaseUrl !== undefined && { purchaseUrl: body.purchaseUrl.trim() }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl?.trim() || null }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      item: updatedItem
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error updating wishlist item:', error)
    return NextResponse.json(
      { error: 'Failed to update wishlist item' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/wishlist/[id] - Delete wishlist item (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Restrict to specific wishlist admin user
    await requireWishlistAdmin()

    const itemId = params.id

    // Check if item exists
    const existingItem = await db.wishlistItem.findUnique({
      where: { id: itemId }
    })

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Delete the item (this will cascade delete confirmations due to our schema)
    await db.wishlistItem.delete({
      where: { id: itemId }
    })

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully'
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error deleting wishlist item:', error)
    return NextResponse.json(
      { error: 'Failed to delete wishlist item' },
      { status: 500 }
    )
  }
}
