import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { sendEmail, generatePasswordResetEmail, EMAIL_BASE_URL } from '@/lib/email'
import { randomBytes } from 'crypto'

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Normalize email: trim whitespace and convert to lowercase
    const normalizedEmail = email.trim().toLowerCase()

    // Find user
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    // Always return success to prevent email enumeration
    // Only send email if user exists and has a password set
    if (user && user.password) {
      // Clean up any existing password reset tokens for this email
      await db.verificationToken.deleteMany({
        where: {
          email: normalizedEmail,
          purpose: 'PASSWORD_RESET',
        },
      })

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Store reset token
      await db.verificationToken.create({
        data: {
          email: normalizedEmail,
          token: resetToken,
          purpose: 'PASSWORD_RESET',
          expiresAt,
        },
      })

      // Send reset email
      const resetUrl = `${EMAIL_BASE_URL}/reset-password?token=${resetToken}`
      const emailTemplate = generatePasswordResetEmail(
        user.name || user.email,
        resetUrl
      )
      emailTemplate.to = normalizedEmail

      await sendEmail(emailTemplate)
    }

    // Always return success message to prevent email enumeration
    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

