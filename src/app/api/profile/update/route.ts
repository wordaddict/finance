import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const updateProfileSchema = z.object({
  zelle: z.string().optional().refine((value) => {
    if (!value) return true // Allow empty values
    
    // Zelle can be either an email or phone number
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/ // International phone format
    
    return emailRegex.test(value) || phoneRegex.test(value.replace(/\D/g, ''))
  }, {
    message: "Zelle information must be a valid email address or phone number"
  }),
})

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth()

    const body = await request.json()
    const data = updateProfileSchema.parse(body)

    // Update user profile
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        zelle: data.zelle || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        zelle: true,
      },
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    })
  } catch (error) {
    console.error('Update profile error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
