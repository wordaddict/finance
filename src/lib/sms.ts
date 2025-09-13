import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export interface SMSTemplate {
  to: string
  body: string
}

export async function sendSMS(template: SMSTemplate): Promise<boolean> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log('Twilio not configured, SMS would be sent:', template)
    return true
  }

  try {
    await client.messages.create({
      body: template.body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: template.to,
    })
    return true
  } catch (error) {
    console.error('Failed to send SMS:', error)
    return false
  }
}

export function generateExpenseSubmittedSMS(
  expenseTitle: string,
  amount: number,
  requesterName: string
): SMSTemplate {
  return {
    to: '', // Will be set by caller
    body: `New expense request: ${expenseTitle} ($${(amount / 100).toFixed(2)}) from ${requesterName}. Please review.`,
  }
}

export function generateExpenseApprovedSMS(
  expenseTitle: string,
  amount: number
): SMSTemplate {
  return {
    to: '',
    body: `Your expense request "${expenseTitle}" ($${(amount / 100).toFixed(2)}) has been approved.`,
  }
}

export function generateExpenseDeniedSMS(
  expenseTitle: string,
  amount: number,
  reason?: string
): SMSTemplate {
  return {
    to: '',
    body: `Your expense request "${expenseTitle}" ($${(amount / 100).toFixed(2)}) has been denied.${reason ? ` Reason: ${reason}` : ''}`,
  }
}

export function generateExpensePaidSMS(
  expenseTitle: string,
  amount: number
): SMSTemplate {
  return {
    to: '',
    body: `Your expense request "${expenseTitle}" ($${(amount / 100).toFixed(2)}) has been paid.`,
  }
}

export function generateReminderSMS(pendingCount: number): SMSTemplate {
  return {
    to: '',
    body: `Reminder: You have ${pendingCount} pending expense request${pendingCount > 1 ? 's' : ''} to review.`,
  }
}
