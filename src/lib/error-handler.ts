import { NextResponse } from 'next/server'
import { sendErrorNotification } from './email'

export interface ApiError {
  message: string
  status: number
  code?: string
}

/**
 * Handles API errors consistently across all routes
 * Sends email notification for 500 errors and logs appropriately
 */
export async function handleApiError(
  error: unknown,
  endpoint: string,
  userId?: string,
  context?: Record<string, any>
): Promise<NextResponse> {
  // Ensure error is an Error object
  const err = error instanceof Error ? error : new Error(String(error))

  // Log the error with context
  const logMessage = `[${endpoint}] ${err.message}`
  const logData = {
    endpoint,
    userId,
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
    context,
  }

  if (err.message.includes('500') || err.message.includes('Internal')) {
    console.error('🔴 500 Internal Server Error:', logData)

    // Send email notification for 500 errors
    try {
      await sendErrorNotification(err, endpoint, userId)
    } catch (emailError) {
      console.error('Failed to send error notification:', emailError)
    }

    return NextResponse.json(
      { error: 'Internal server error. The development team has been notified.' },
      { status: 500 }
    )
  }

  // Handle other error types
  if (err.message.includes('401') || err.message.includes('Unauthorized')) {
    console.warn('🟡 401 Unauthorized:', logData)
    return NextResponse.json(
      { error: 'Unauthorized access' },
      { status: 401 }
    )
  }

  if (err.message.includes('403') || err.message.includes('Forbidden')) {
    console.warn('🟠 403 Forbidden:', logData)
    return NextResponse.json(
      { error: 'Access forbidden' },
      { status: 403 }
    )
  }

  if (err.message.includes('404') || err.message.includes('Not found')) {
    console.warn('🟡 404 Not Found:', logData)
    return NextResponse.json(
      { error: 'Resource not found' },
      { status: 404 }
    )
  }

  if (err.message.includes('400') || err.message.includes('Bad request')) {
    console.warn('🟡 400 Bad Request:', logData)
    return NextResponse.json(
      { error: 'Bad request' },
      { status: 400 }
    )
  }

  // Default to 500 for unknown errors
  console.error('🔴 Unknown Error:', logData)

  try {
    await sendErrorNotification(err, endpoint, userId)
  } catch (emailError) {
    console.error('Failed to send error notification:', emailError)
  }

  return NextResponse.json(
    { error: 'Internal server error. The development team has been notified.' },
    { status: 500 }
  )
}

/**
 * Helper function to get user ID from request context
 * This tries to extract user ID from various sources
 */
export function getUserIdFromRequest(request: Request, user?: { id?: string }): string | undefined {
  // Try to get from user object if available
  if (user?.id) {
    return user.id
  }

  // Could be extended to extract from headers, cookies, etc.
  // For now, just return undefined
  return undefined
}
