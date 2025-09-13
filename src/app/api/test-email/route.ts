import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, generateExpenseSubmittedEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Test email template
    const template = generateExpenseSubmittedEmail(
      'Test User',
      'Test Expense Request',
      5000, // $50.00
      'Test Requester'
    )
    
    template.to = email

    const success = await sendEmail(template)
    
    if (success) {
      return NextResponse.json({
        message: 'Test email sent successfully',
        email: email
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send test email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
