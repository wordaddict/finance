import { Resend } from 'resend'
import { db } from './db'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailTemplate {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(template: EmailTemplate): Promise<boolean> {
  // Check if email notifications are disabled via environment variable
  if (process.env.DISABLE_EMAIL_NOTIFICATIONS === 'true') {
    console.log('Email notifications disabled via DISABLE_EMAIL_NOTIFICATIONS env var. Email would be sent:', {
      to: template.to,
      subject: template.subject
    })
    return true
  }

  if (!process.env.RESEND_API_KEY) {
    console.log('Resend not configured, email would be sent:', template)
    return true
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'adeyinkamichealola@gmail.com',
      to: [template.to],
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    if (error) {
      console.error('Failed to send email:', error)
      return false
    }

    console.log('Email sent successfully:', data?.id)
    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}

export function generateExpenseSubmittedEmail(
  recipientName: string,
  expenseTitle: string,
  amount: number,
  requesterName: string
): EmailTemplate {
  return {
    to: '', // Will be set by caller
    subject: `New Expense Request: ${expenseTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Expense Request Submitted</h2>
        <p>Hello ${recipientName},</p>
        <p>A new expense request has been submitted and requires your review:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${expenseTitle}</h3>
          <p><strong>Amount:</strong> $${(amount / 100).toFixed(2)}</p>
          <p><strong>Requested by:</strong> ${requesterName}</p>
        </div>
        <p>Please log in to review and approve or deny this request.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `New Expense Request: ${expenseTitle}\n\nAmount: $${(amount / 100).toFixed(2)}\nRequested by: ${requesterName}\n\nPlease log in to review this request.`,
  }
}

export function generateExpenseApprovedEmail(
  recipientName: string,
  expenseTitle: string,
  amount: number
): EmailTemplate {
  return {
    to: '',
    subject: `Expense Request Approved: ${expenseTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Expense Request Approved</h2>
        <p>Hello ${recipientName},</p>
        <p>Your expense request has been approved:</p>
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${expenseTitle}</h3>
          <p><strong>Amount:</strong> $${(amount / 100).toFixed(2)}</p>
        </div>
        <p>You will be notified once payment has been processed.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `Expense Request Approved: ${expenseTitle}\n\nAmount: $${(amount / 100).toFixed(2)}\n\nYou will be notified once payment has been processed.`,
  }
}

export function generateExpenseDeniedEmail(
  recipientName: string,
  expenseTitle: string,
  amount: number,
  reason?: string
): EmailTemplate {
  return {
    to: '',
    subject: `Expense Request Denied: ${expenseTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Expense Request Denied</h2>
        <p>Hello ${recipientName},</p>
        <p>Your expense request has been denied:</p>
        <div style="background: #ffeaea; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${expenseTitle}</h3>
          <p><strong>Amount:</strong> $${(amount / 100).toFixed(2)}</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        <p>If you have questions, please contact your team leader.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `Expense Request Denied: ${expenseTitle}\n\nAmount: $${(amount / 100).toFixed(2)}\n${reason ? `Reason: ${reason}\n` : ''}\nIf you have questions, please contact your team leader.`,
  }
}

export function generateExpensePaidEmail(
  recipientName: string,
  expenseTitle: string,
  amount: number
): EmailTemplate {
  return {
    to: '',
    subject: `Expense Request Paid: ${expenseTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Expense Request Paid</h2>
        <p>Hello ${recipientName},</p>
        <p>Your expense request has been paid:</p>
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${expenseTitle}</h3>
          <p><strong>Amount:</strong> $${(amount / 100).toFixed(2)}</p>
        </div>
        <p>Thank you for your service to the church.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `Expense Request Paid: ${expenseTitle}\n\nAmount: $${(amount / 100).toFixed(2)}\n\nThank you for your service to the church.`,
  }
}

export function generateReminderEmail(
  recipientName: string,
  pendingCount: number
): EmailTemplate {
  return {
    to: '',
    subject: `Reminder: ${pendingCount} Pending Expense Request${pendingCount > 1 ? 's' : ''}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Pending Expense Requests Reminder</h2>
        <p>Hello ${recipientName},</p>
        <p>You have ${pendingCount} pending expense request${pendingCount > 1 ? 's' : ''} that require${pendingCount === 1 ? 's' : ''} your attention.</p>
        <p>Please log in to review and process these requests.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `You have ${pendingCount} pending expense request${pendingCount > 1 ? 's' : ''} that require${pendingCount === 1 ? 's' : ''} your attention. Please log in to review these requests.`,
  }
}

export function generateUserApprovedEmail(
  recipientName: string,
  recipientEmail: string,
  reason?: string
): EmailTemplate {
  return {
    to: recipientEmail,
    subject: 'Account Approved - Welcome to the Church Expense System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Account Approved</h2>
        <p>Hello ${recipientName},</p>
        <p>Great news! Your account has been approved and you now have access to the Church Expense System.</p>
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Account Details</h3>
          <p><strong>Email:</strong> ${recipientEmail}</p>
          <p><strong>Status:</strong> Active</p>
          ${reason ? `<p><strong>Admin Note:</strong> ${reason}</p>` : ''}
        </div>
        <p>You can now log in to the system and submit expense requests.</p>
        <p>If you have any questions, please contact your team leader or administrator.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `Account Approved\n\nHello ${recipientName},\n\nGreat news! Your account has been approved and you now have access to the Church Expense System.\n\nAccount Details:\nEmail: ${recipientEmail}\nStatus: Active${reason ? `\nAdmin Note: ${reason}` : ''}\n\nYou can now log in to the system and submit expense requests.\n\nIf you have any questions, please contact your team leader or administrator.\n\nBest regards,\nChurch Expense System`,
  }
}

export function generateUserDeniedEmail(
  recipientName: string,
  recipientEmail: string,
  reason: string
): EmailTemplate {
  return {
    to: recipientEmail,
    subject: 'Account Registration Denied',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Account Registration Denied</h2>
        <p>Hello ${recipientName},</p>
        <p>We regret to inform you that your account registration has been denied.</p>
        <div style="background: #ffeaea; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Registration Details</h3>
          <p><strong>Email:</strong> ${recipientEmail}</p>
          <p><strong>Status:</strong> Denied</p>
          <p><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>If you believe this decision was made in error or have additional information to provide, please contact the church administration.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `Account Registration Denied\n\nHello ${recipientName},\n\nWe regret to inform you that your account registration has been denied.\n\nRegistration Details:\nEmail: ${recipientEmail}\nStatus: Denied\nReason: ${reason}\n\nIf you believe this decision was made in error or have additional information to provide, please contact the church administration.\n\nBest regards,\nChurch Expense System`,
  }
}

export function generateUserSuspendedEmail(
  recipientName: string,
  recipientEmail: string,
  reason: string
): EmailTemplate {
  return {
    to: recipientEmail,
    subject: 'Account Suspended - Church Expense System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Account Suspended</h2>
        <p>Hello ${recipientName},</p>
        <p>Your account has been suspended and you no longer have access to the Church Expense System.</p>
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3>Account Details</h3>
          <p><strong>Email:</strong> ${recipientEmail}</p>
          <p><strong>Status:</strong> Suspended</p>
          <p><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>If you have questions about this suspension or wish to appeal this decision, please contact the church administration immediately.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `Account Suspended\n\nHello ${recipientName},\n\nYour account has been suspended and you no longer have access to the Church Expense System.\n\nAccount Details:\nEmail: ${recipientEmail}\nStatus: Suspended\nReason: ${reason}\n\nIf you have questions about this suspension or wish to appeal this decision, please contact the church administration immediately.\n\nBest regards,\nChurch Expense System`,
  }
}
