import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

const setPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = setPasswordSchema.parse(body)

    // Find user
    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.emailVerifiedAt) {
      return NextResponse.json(
        { error: 'Email must be verified before setting password' },
        { status: 400 }
      )
    }

    if (user.password) {
      return NextResponse.json(
        { error: 'Password has already been set' },
        { status: 400 }
      )
    }

    // Hash and set password
    const hashedPassword = await hashPassword(password)
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({
      message: 'Password set successfully. You can now log in.',
    })
  } catch (error) {
    console.error('Set password error:', error)
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    )
  }
}
