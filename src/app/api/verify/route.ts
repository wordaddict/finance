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
      include: { user: true },
    })

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      )
    }

    // Check if user still exists
    if (!verificationToken.user) {
      // Clean up orphaned token
      await db.verificationToken.delete({
        where: { id: verificationToken.id },
      })
      return NextResponse.json(
        { error: 'User account no longer exists. Please register again.' },
        { status: 400 }
      )
    }

    if (verificationToken.expiresAt < new Date()) {
      // Clean up expired token
      await db.verificationToken.delete({
        where: { id: verificationToken.id },
      })
      return NextResponse.json(
        { error: 'Verification token has expired. Please request a new verification email.' },
        { status: 400 }
      )
    }

    try {
      // Use a transaction to prevent race conditions
      await db.$transaction(async (tx: { user: { findUnique: (arg0: { where: { email: any }; select: { emailVerifiedAt: boolean; status: boolean } }) => any; update: (arg0: { where: { email: any }; data: { emailVerifiedAt: Date } }) => any }; verificationToken: { delete: (arg0: { where: { id: any } | { id: any } }) => any; update: (arg0: { where: { id: any }; data: { usedAt: Date } }) => any } }) => {
        // Re-fetch the user to get the most current state
        const currentUser = await tx.user.findUnique({
          where: { email: verificationToken.email },
          select: { emailVerifiedAt: true, status: true }
        })

        if (!currentUser) {
          // Clean up orphaned token
          await tx.verificationToken.delete({
            where: { id: verificationToken.id },
          })
          throw new Error('User account no longer exists. Please register again.')
        }

        // Check if email is already verified
        if (currentUser.emailVerifiedAt) {
          // Clean up redundant token
          await tx.verificationToken.delete({
            where: { id: verificationToken.id },
          })
          throw new Error('This email address has already been verified. You can now log in to your account.')
        }

        // Mark user email as verified
        await tx.user.update({
          where: { email: verificationToken.email },
          data: { emailVerifiedAt: new Date() },
        })

        // Mark token as used (only if not already used)
        if (!verificationToken.usedAt) {
          await tx.verificationToken.update({
            where: { id: verificationToken.id },
            data: { usedAt: new Date() },
          })
        }
      })

      return NextResponse.json({
        message: 'Email verified successfully. Your account is now verified and pending administrator approval.',
      })
    } catch (transactionError: any) {
      // Handle specific transaction errors
      if (transactionError.message.includes('already been verified') || 
          transactionError.message.includes('User account no longer exists')) {
        return NextResponse.json(
          { error: transactionError.message },
          { status: 400 }
        )
      }
      throw transactionError
    }
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'Email verification failed' },
      { status: 500 }
    )
  }
}
