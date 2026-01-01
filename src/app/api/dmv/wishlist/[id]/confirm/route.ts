import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

interface ConfirmationRequest {
  quantity: number
  donorName?: string | null
  donorEmail?: string | null
  note?: string | null
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { quantity, donorName, donorEmail, note }: ConfirmationRequest = await request.json()
    const itemId = params.id

    // Validate input
    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
        { status: 400 }
      )
    }

    // Get the item and current confirmations count
    const item = await db.wishlistItem.findUnique({
      where: { id: itemId },
      include: {
        _count: {
          select: {
            confirmations: true
          }
        }
      }
    })

    if (!item || !item.isActive) {
      return NextResponse.json(
        { error: 'Item not found or no longer available' },
        { status: 404 }
      )
    }

    const currentConfirmed = item._count.confirmations
    const remaining = Math.max(0, item.quantityNeeded - currentConfirmed)

    if (remaining <= 0) {
      return NextResponse.json(
        { error: 'This item has already been fulfilled' },
        { status: 400 }
      )
    }

    if (quantity > remaining) {
      return NextResponse.json(
        {
          error: `Cannot confirm ${quantity} items. Only ${remaining} still needed.`
        },
        { status: 400 }
      )
    }

    // Get client IP for basic rate limiting
    const ip = request.ip ||
               request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Create IP hash for privacy (we don't store actual IPs)
    const ipHash = createHash('sha256').update(ip).digest('hex')

    // Get user agent
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Basic rate limiting: check for recent confirmations from same IP
    const recentConfirmations = await db.wishlistConfirmation.findMany({
      where: {
        ipHash,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      }
    })

    // Allow max 3 confirmations per IP per 5 minutes to prevent abuse
    if (recentConfirmations.length >= 3) {
      return NextResponse.json(
        { error: 'Too many recent confirmations from this IP. Please try again later.' },
        { status: 429 }
      )
    }

    // Use transaction to ensure atomicity
    await db.$transaction(async (tx) => {
      // Create the confirmation
      await tx.wishlistConfirmation.create({
        data: {
          itemId,
          quantity,
          donorName,
          donorEmail,
          note,
          ipHash,
          userAgent,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Thank you for your generous donation! Your confirmation has been recorded.'
    })

  } catch (error) {
    console.error('Error processing confirmation:', error)
    return NextResponse.json(
      { error: 'Failed to process confirmation. Please try again.' },
      { status: 500 }
    )
  }
}
