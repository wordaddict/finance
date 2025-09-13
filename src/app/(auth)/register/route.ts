import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'CAMPUS_PASTOR', 'LEADER']).default('LEADER'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, role } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Create user without password (will be set after email verification)
    const user = await db.user.create({
      data: {
        email,
        name,
        role,
      },
    })

    // Generate verification token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await db.verificationToken.create({
      data: {
        email,
        token,
        purpose: 'verify_email',
        expiresAt,
      },
    })

    // Send verification email
    const emailTemplate = generateVerificationEmail(name, token)
    emailTemplate.to = email
    await sendEmail(emailTemplate)

    return NextResponse.json({
      message: 'Registration successful. Please check your email to verify your account.',
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}

function generateVerificationEmail(name: string, token: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${token}`
  
  return {
    to: '',
    subject: 'Verify your email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Church Expense System</h2>
        <p>Hello ${name},</p>
        <p>Thank you for registering. Please click the link below to verify your email address:</p>
        <p><a href="${verifyUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `Welcome to Church Expense System\n\nHello ${name},\n\nThank you for registering. Please visit the following link to verify your email address:\n\n${verifyUrl}\n\nThis link will expire in 24 hours.\n\nBest regards,\nChurch Expense System`,
  }
}
