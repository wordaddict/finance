import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { deleteSession, clearSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const sessionId = cookieStore.get('session')?.value

    if (sessionId) {
      await deleteSession(sessionId)
    }

    const response = NextResponse.json({
      message: 'Logout successful',
    })

    clearSessionCookie(response)

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}
