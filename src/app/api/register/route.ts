import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

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

    return NextResponse.json({
      message: 'Registration successful. Your account is pending approval from an administrator. You will be notified once approved.',
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}

