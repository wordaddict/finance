import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { generateUploadSignature } from '@/lib/cloudinary'

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth()

    const body = await request.json()
    const { folder = 'expense-receipts' } = body

    const signature = generateUploadSignature(folder)

    return NextResponse.json(signature)
  } catch (error) {
    console.error('Cloudinary signature error:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload signature' },
      { status: 500 }
    )
  }
}
