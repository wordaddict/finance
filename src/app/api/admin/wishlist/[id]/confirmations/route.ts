import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'Admin wishlist is no longer available' },
    { status: 410 }
  )
}
