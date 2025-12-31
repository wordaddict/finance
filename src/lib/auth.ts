import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from './db'
import { hash, verify } from 'argon2'
import { randomBytes } from 'crypto'
import { CampusValue } from './constants'

export interface SessionUser {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'CAMPUS_PASTOR' | 'LEADER'
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED'
  campus: CampusValue
  zelle?: string | null
}

export async function hashPassword(password: string): Promise<string> {
  return await hash(password)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await verify(hashedPassword, password)
  } catch {
    return false
  }
}

export async function createSession(userId: string, request: NextRequest): Promise<string> {
  const sessionId = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000) // 5 hour

  await db.session.create({
    data: {
      id: sessionId,
      userId,
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      expiresAt,
    },
  })

  return sessionId
}

export async function getSession(sessionId: string): Promise<SessionUser | null> {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as 'ADMIN' | 'CAMPUS_PASTOR' | 'LEADER',
    status: session.user.status as 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED',
    campus: session.user.campus as CampusValue,
    zelle: session.user.zelle,
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.session.delete({
    where: { id: sessionId },
  })
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = cookies()
  const sessionId = cookieStore.get('session')?.value

  if (!sessionId) {
    return null
  }

  return await getSession(sessionId)
}

export function setSessionCookie(sessionId: string, response: NextResponse): void {
  response.cookies.set('session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 5 * 60 * 60, // 5 hour
  })
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete('session')
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

export async function requireRole(allowedRoles: string[]): Promise<SessionUser> {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Insufficient permissions')
  }
  return user
}
