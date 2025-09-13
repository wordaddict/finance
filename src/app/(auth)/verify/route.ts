import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Find and validate token
    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    })

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      )
    }

    if (verificationToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Verification token has expired' },
        { status: 400 }
      )
    }

    if (verificationToken.usedAt) {
      return NextResponse.json(
        { error: 'Verification token has already been used' },
        { status: 400 }
      )
    }

    // Mark token as used
    await db.verificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    })

    // Mark user email as verified
    await db.user.update({
      where: { email: verificationToken.email },
      data: { emailVerifiedAt: new Date() },
    })

    return NextResponse.json({
      message: 'Email verified successfully. You can now set your password.',
      redirectTo: '/set-password?email=' + encodeURIComponent(verificationToken.email),
    })
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'Email verification failed' },
      { status: 500 }
    )
  }
}
