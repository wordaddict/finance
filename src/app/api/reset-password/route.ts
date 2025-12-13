import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = resetPasswordSchema.parse(body)

    // Find and validate token
    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Check if token is for password reset
    if (verificationToken.purpose !== 'PASSWORD_RESET') {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 400 }
      )
    }

    // Check if token has been used
    if (verificationToken.usedAt) {
      return NextResponse.json(
        { error: 'This reset link has already been used. Please request a new one.' },
        { status: 400 }
      )
    }

    // Check if token has expired
    if (verificationToken.expiresAt < new Date()) {
      // Clean up expired token
      await db.verificationToken.delete({
        where: { id: verificationToken.id },
      })
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new password reset.' },
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
        { error: 'User account no longer exists' },
        { status: 400 }
      )
    }

    // Use a transaction to prevent race conditions
    await db.$transaction(async (tx) => {
      // Re-fetch the token to ensure it hasn't been used
      const currentToken = await tx.verificationToken.findUnique({
        where: { id: verificationToken.id },
      })

      if (!currentToken || currentToken.usedAt) {
        throw new Error('This reset link has already been used. Please request a new one.')
      }

      // Hash and update password
      const hashedPassword = await hashPassword(password)
      await tx.user.update({
        where: { email: verificationToken.email },
        data: { password: hashedPassword },
      })

      // Mark token as used
      await tx.verificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      })
    })

    return NextResponse.json({
      message: 'Password reset successfully. You can now log in with your new password.',
    })
  } catch (error: any) {
    console.error('Reset password error:', error)
    
    // Handle specific transaction errors
    if (error.message && error.message.includes('already been used')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}

