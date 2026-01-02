import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'
import { sendEmail } from '@/lib/email'

interface ContributionRequest {
  amountCents: number
  donorName?: string | null
  donorEmail?: string | null
  note?: string | null
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { amountCents, donorName, donorEmail, note }: ContributionRequest = await request.json()
    const itemId = params.id

    if (!amountCents || amountCents < 1) {
      return NextResponse.json(
        { error: 'Please contribute at least $0.01.' },
        { status: 400 }
      )
    }

    const item = await db.wishlistItem.findUnique({
      where: { id: itemId },
    })

    if (!item || !item.isActive || !item.allowContributions) {
      return NextResponse.json(
        { error: 'Item not found or not accepting contributions' },
        { status: 404 }
      )
    }

    const [confirmationSum, contributionSum] = await Promise.all([
      db.wishlistConfirmation.aggregate({
        where: { itemId },
        _sum: { quantity: true },
      }),
      db.wishlistContribution.aggregate({
        where: { itemId },
        _sum: { amountCents: true },
      })
    ])

    const confirmedQuantity = confirmationSum._sum.quantity ?? 0
    const contributedCents = contributionSum._sum.amountCents ?? 0

    const goalCents = item.priceCents * item.quantityNeeded
    const confirmedValueCents = confirmedQuantity * item.priceCents + contributedCents
    const remainingValueCents = Math.max(0, goalCents - confirmedValueCents)

    if (remainingValueCents <= 0) {
      return NextResponse.json(
        { error: 'This item has already been fully funded.' },
        { status: 400 }
      )
    }

    if (amountCents > remainingValueCents) {
      return NextResponse.json(
        { error: `This item needs only ${remainingValueCents} cents more. Please adjust your amount.` },
        { status: 400 }
      )
    }

    const ip = request.ip ||
               request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown'
    const ipHash = createHash('sha256').update(ip).digest('hex')
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const recentContributions = await db.wishlistContribution.findMany({
      where: {
        ipHash,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000)
        }
      }
    })

    if (recentContributions.length >= 3) {
      return NextResponse.json(
        { error: 'Too many recent contributions from this IP. Please try again later.' },
        { status: 429 }
      )
    }

    await db.wishlistContribution.create({
      data: {
        itemId,
        amountCents,
        donorName,
        donorEmail,
        note,
        ipHash,
        userAgent,
      },
    })

    const donorLabel = donorName?.trim() || 'Anonymous donor'
    const formattedAmount = `$${(amountCents / 100).toFixed(2)}`

    await sendEmail({
      to: 'femi2tin@gmail.com',
      subject: `New Wish List Contribution: ${item.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Contribution Received</h2>
          <p>${donorLabel} just contributed toward an item.</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Item:</strong> ${item.title}</p>
            <p><strong>Amount:</strong> ${formattedAmount}</p>
            ${donorEmail ? `<p><strong>Donor Email:</strong> ${donorEmail}</p>` : ''}
            ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
          </div>
          <p style="color:#555;font-size:14px;">This is an automated notification.</p>
        </div>
      `,
      text: `New contribution\n\nItem: ${item.title}\nAmount: ${formattedAmount}\nDonor: ${donorLabel}${donorEmail ? `\nEmail: ${donorEmail}` : ''}${note ? `\nNote: ${note}` : ''}`,
    })

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your contribution has been recorded.'
    })
  } catch (error) {
    console.error('Error processing contribution:', error)
    return NextResponse.json(
      { error: 'Failed to process contribution. Please try again.' },
      { status: 500 }
    )
  }
}

