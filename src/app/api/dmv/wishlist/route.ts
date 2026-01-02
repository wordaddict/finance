import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'DMV wishlist is no longer available' },
    { status: 410 }
  )
}
