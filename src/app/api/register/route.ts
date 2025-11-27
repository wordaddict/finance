import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { sendEmail, generateEmailVerificationEmail, sendEmailsWithRateLimit, generatePendingAccountApprovalEmail } from '@/lib/email'
import { randomBytes } from 'crypto'
import { CAMPUS_VALUES, CAMPUS_DISPLAY_NAMES } from '@/lib/constants'
import { Campus } from '@prisma/client'

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(1, 'Full name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: z.enum(['ADMIN', 'CAMPUS_PASTOR', 'LEADER']).default('LEADER'),
  campus: z.enum(CAMPUS_VALUES as [string, ...string[]]),
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
        campus: campus as Campus,
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

    // Notify all admins about the pending account approval
    try {
      const admins = await db.user.findMany({
        where: {
          role: 'ADMIN',
          status: 'ACTIVE', // Only send to active admins
        },
      })

      // Prepare email templates for all admins
      const emailTemplates = admins.map((admin: any) => {
        const emailTemplate = generatePendingAccountApprovalEmail(
          admin.name || admin.email,
          name.trim(),
          normalizedEmail,
          role === 'ADMIN' ? 'Admin' : role === 'CAMPUS_PASTOR' ? 'Campus Pastor' : 'Leader',
          CAMPUS_DISPLAY_NAMES[campus as keyof typeof CAMPUS_DISPLAY_NAMES] || campus,
          process.env.NEXT_PUBLIC_APP_URL!
        )
        emailTemplate.to = admin.email
        return emailTemplate
      })

      // Send notifications to admins with rate limiting (500ms delay = 2 emails per second)
      const emailResults = await sendEmailsWithRateLimit(emailTemplates, 500)
      
      if (emailResults.failed > 0) {
        console.warn(`Failed to send ${emailResults.failed} out of ${admins.length} admin notification emails:`, emailResults.errors)
      }
    } catch (emailError) {
      console.error('Failed to send admin notification emails:', emailError)
      // Don't fail the registration if admin notification fails
    }

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

