import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { sendEmail, generateEmailVerificationEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(1, 'Full name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: z.enum(['ADMIN', 'CAMPUS_PASTOR', 'LEADER']).default('LEADER'),
  campus: z.enum(['DMV', 'DALLAS', 'BOSTON', 'AUSTIN', 'CCI_USA_NASHVILLE', 'CCI_USA_OKLAHOMA', 'CCI_USA_NEWYORK_NEWJERSEY', 'CCI_USA_KNOXVILLE', 'CCI_USA_NORTH_CAROLINA', 'CCI_USA_ATLANTA', 'CCI_USA_BAY_AREA', 'CCI_USA_CHICAGO']),
  zelle: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, password, role, campus, zelle } = registerSchema.parse(body)

    // Normalize email: trim whitespace and convert to lowercase
    const normalizedEmail = email.trim().toLowerCase()

    // Check if user already exists with normalized email
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user with pending approval status
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(), // Also trim the name
        password: hashedPassword,
        role,
        campus,
        zelle: zelle?.trim() || null, // Add Zelle info if provided
        status: 'PENDING_APPROVAL', // New status for pending approval
      },
    })

    // Clean up any existing verification tokens for this email
    await db.verificationToken.deleteMany({
      where: { email: normalizedEmail },
    })

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store verification token
    await db.verificationToken.create({
      data: {
        email: normalizedEmail,
        token: verificationToken,
        purpose: 'EMAIL_VERIFICATION',
        expiresAt,
      },
    })

    // Send verification email
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${verificationToken}`
    const emailTemplate = generateEmailVerificationEmail(
      name.trim(),
      verificationUrl,
      process.env.NEXT_PUBLIC_APP_URL!
    )
    emailTemplate.to = normalizedEmail

    await sendEmail(emailTemplate)

    return NextResponse.json({
      message: 'Registration successful. Please check your email to verify your account before it can be approved by an administrator.',
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}

