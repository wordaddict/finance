import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Prisma, WishlistItem as WishlistItemModel } from '@prisma/client'
import { requireWishlistAdmin } from '@/lib/auth'

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
  allowContributions?: boolean
}

// GET /api/admin/wishlist - List all wishlist items (admin only)
export async function GET(request: NextRequest) {
  try {
    // Restrict to specific wishlist admin user
    await requireWishlistAdmin()
    const [items, confirmationSums, contributionSums] = await Promise.all([
      db.wishlistItem.findMany({
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
      }),
      db.wishlistConfirmation.groupBy({
        by: ['itemId'],
        _sum: { quantity: true },
        _count: true,
      }),
      db.wishlistContribution.groupBy({
        by: ['itemId'],
        _sum: { amountCents: true },
        _count: true,
      }),
    ])

    const quantityMap = new Map<string, number>(
      confirmationSums.map(
        (entry: { itemId: string; _sum: { quantity: number | null }; _count: number }) => [
          entry.itemId,
          entry._sum?.quantity ?? 0
        ]
      )
    )
    const contributionMap = new Map<string, number>(
      contributionSums.map(
        (entry: { itemId: string; _sum: { amountCents: number | null }; _count: number }) => [
          entry.itemId,
          entry._sum?.amountCents ?? 0
        ]
      )
    )
    const confirmationCountMap = new Map<string, number>(
      confirmationSums.map(
        (entry: { itemId: string; _count: number }) => [entry.itemId, entry._count ?? 0]
      )
    )
    const contributionCountMap = new Map<string, number>(
      contributionSums.map(
        (entry: { itemId: string; _count: number }) => [entry.itemId, entry._count ?? 0]
      )
    )

    const itemsWithProgress = items.map((item: WishlistItemModel) => {
      const quantityConfirmed = quantityMap.get(item.id) ?? 0
      const contributedCents = contributionMap.get(item.id) ?? 0
      const goalCents = item.priceCents * item.quantityNeeded
      const confirmedValueCents = quantityConfirmed * item.priceCents + contributedCents
      const remainingValueCents = Math.max(0, goalCents - confirmedValueCents)
      const donorsCount =
        (confirmationCountMap.get(item.id) ?? 0) + (contributionCountMap.get(item.id) ?? 0)

      return {
        ...item,
        quantityConfirmed,
        contributedCents,
        goalCents,
        confirmedValueCents,
        remainingValueCents,
        donorsCount,
      }
    })

    return NextResponse.json({
      success: true,
      items: itemsWithProgress
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
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
    // Restrict to specific wishlist admin user
    await requireWishlistAdmin()
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
        allowContributions: body.allowContributions === true,
      },
    })

    return NextResponse.json({
      success: true,
      item
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error creating wishlist item:', error)
    return NextResponse.json(
      { error: 'Failed to create wishlist item' },
      { status: 500 }
    )
  }
}
