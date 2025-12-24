import { Resend } from 'resend'
import { db } from './db'
import { formatRoleName } from './utils'

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
      from: process.env.FROM_EMAIL!,
      to: [template.to],
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    if (error) {
      console.error('Failed to send email:', error)
      return false
    }

    console.log('Email sent successfully:', data)
    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}

// Rate-limited email sending for multiple recipients
export async function sendEmailsWithRateLimit(
  emailTemplates: EmailTemplate[],
  delayMs: number = 500
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0
  let failed = 0
  const errors: string[] = []

  for (let i = 0; i < emailTemplates.length; i++) {
    try {
      const template = emailTemplates[i]
      const result = await sendEmail(template)
      
      if (result) {
        success++
      } else {
        failed++
        errors.push(`Failed to send email to ${template.to}`)
      }

      // Add delay between emails to respect rate limits
      if (i < emailTemplates.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    } catch (error) {
      failed++
      const errorMsg = `Error sending email to ${emailTemplates[i].to}: ${error}`
      errors.push(errorMsg)
      console.error(errorMsg)
    }
  }

  return { success, failed, errors }
}

export function generateExpenseSubmittedEmail(
  recipientName: string,
  expenseTitle: string,
  amount: number,
  requesterName: string,
  baseUrl: string
): EmailTemplate {
  const appUrl = baseUrl
  const expenseUrl = `${appUrl}/expenses`
  
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
        <div style="text-align: center; margin: 30px 0;">
          <a href="${expenseUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review Expense Request
          </a>
        </div>
        <p>You can also log in to your account to review and approve or deny this request.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `New Expense Request: ${expenseTitle}\n\nAmount: $${(amount / 100).toFixed(2)}\nRequested by: ${requesterName}\n\nPlease log in to review this request at: ${expenseUrl}`,
  }
}

export function generateExpenseApprovedEmail(
  recipientName: string,
  expenseTitle: string,
  amount: number,
  baseUrl: string
): EmailTemplate {
  const appUrl = baseUrl
  const expenseUrl = `${appUrl}/expenses`
  
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
        <div style="text-align: center; margin: 30px 0;">
          <a href="${expenseUrl}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Expense Details
          </a>
        </div>
        <p>You will be notified once payment has been processed.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `Expense Request Approved: ${expenseTitle}\n\nAmount: $${(amount / 100).toFixed(2)}\n\nYou will be notified once payment has been processed.\n\nView details at: ${expenseUrl}`,
  }
}

export function generateExpenseDeniedEmail(
  recipientName: string,
  expenseTitle: string,
  amount: number,
  baseUrl: string,
  reason?: string,
): EmailTemplate {
  const appUrl = baseUrl
  const expenseUrl = `${appUrl}/expenses`
  
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
        <div style="text-align: center; margin: 30px 0;">
          <a href="${expenseUrl}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Expense Details
          </a>
        </div>
        <p>If you have questions, please contact your team leader.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `Expense Request Denied: ${expenseTitle}\n\nAmount: $${(amount / 100).toFixed(2)}\n${reason ? `Reason: ${reason}\n` : ''}\nIf you have questions, please contact your team leader.\n\nView details at: ${expenseUrl}`,
  }
}

export function generateExpensePaidEmail(
  recipientName: string,
  expenseTitle: string,
  amount: number,
  baseUrl: string
): EmailTemplate {
  const appUrl = baseUrl
  const expenseUrl = `${appUrl}/expenses`
  
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
        <div style="text-align: center; margin: 30px 0;">
          <a href="${expenseUrl}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Expense Details
          </a>
        </div>
        <p>Thank you for your service to the church.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `Expense Request Paid: ${expenseTitle}\n\nAmount: $${(amount / 100).toFixed(2)}\n\nThank you for your service to the church.\n\nView details at: ${expenseUrl}`,
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

export function generatePendingAccountApprovalEmail(
  recipientName: string,
  newUserName: string,
  newUserEmail: string,
  newUserRole: string,
  newUserCampus: string,
  baseUrl: string
): EmailTemplate {
  const usersUrl = `${baseUrl}/users`
  
  return {
    to: '', // Will be set by caller
    subject: `New Account Pending Approval: ${newUserName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Account Pending Approval</h2>
        <p>Hello ${recipientName},</p>
        <p>A new user has registered and is waiting for approval:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>New User Details</h3>
          <p><strong>Name:</strong> ${newUserName}</p>
          <p><strong>Email:</strong> ${newUserEmail}</p>
          <p><strong>Role:</strong> ${formatRoleName(newUserRole)}</p>
          <p><strong>Campus:</strong> ${newUserCampus}</p>
          <p><strong>Status:</strong> Pending Approval</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${usersUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review Pending Accounts
          </a>
        </div>
        <p>Please log in to review and approve or deny this account request.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `New Account Pending Approval\n\nHello ${recipientName},\n\nA new user has registered and is waiting for approval:\n\nName: ${newUserName}\nEmail: ${newUserEmail}\nRole: ${formatRoleName(newUserRole)}\nCampus: ${newUserCampus}\nStatus: Pending Approval\n\nPlease log in to review and approve or deny this account request at: ${usersUrl}`,
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

export function generateExpenseReportCreatedEmail(
  recipientName: string,
  reportTitle: string,
  totalApprovedAmount: number,
  reporterName: string,
  baseUrl: string
): EmailTemplate {
  const appUrl = baseUrl
  const reportsUrl = `${appUrl}/reports`
  
  return {
    to: '',
    subject: `New Expense Report Submitted: ${reportTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Expense Report Submitted</h2>
        <p>Hello ${recipientName},</p>
        <p>A new expense report has been submitted and requires your review:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${reportTitle}</h3>
          <p><strong>Total Approved Amount:</strong> $${(totalApprovedAmount / 100).toFixed(2)}</p>
          <p><strong>Submitted by:</strong> ${reporterName}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${reportsUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review Expense Report
          </a>
        </div>
        <p>Please review the expense report and any attached documentation.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `New Expense Report Submitted: ${reportTitle}\n\nTotal Approved Amount: $${(totalApprovedAmount / 100).toFixed(2)}\nSubmitted by: ${reporterName}\n\nPlease review the expense report at: ${reportsUrl}`,
  }
}

export function generateExpenseChangeRequestedEmail(
  recipientName: string,
  expenseTitle: string,
  amount: number,
  requesterName: string,
  comment: string,
  baseUrl: string
): EmailTemplate {
  const appUrl = baseUrl
  const expenseUrl = `${appUrl}/expenses`
  
  return {
    to: '',
    subject: `Change Requested for Approved Expense: ${expenseTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Change Requested for Approved Expense</h2>
        <p>Hello ${recipientName},</p>
        <p>A requester has requested to add more items to an approved expense:</p>
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3>${expenseTitle}</h3>
          <p><strong>Current Amount:</strong> $${(amount / 100).toFixed(2)}</p>
          <p><strong>Requested by:</strong> ${requesterName}</p>
          <div style="background: #fff; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0;">
            <p><strong>Reason/Comment:</strong></p>
            <p style="margin: 10px 0; font-style: italic;">"${comment}"</p>
          </div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${expenseUrl}" style="background: #ffc107; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Review Change Request
          </a>
        </div>
        <p>The expense status has been changed to "Change Requested" and the requester can now add more items. Please review the updated expense once they submit the changes.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `Change Requested for Approved Expense: ${expenseTitle}\n\nCurrent Amount: $${(amount / 100).toFixed(2)}\nRequested by: ${requesterName}\n\nReason/Comment: "${comment}"\n\nThe expense status has been changed to "Change Requested" and the requester can now add more items. Please review the updated expense once they submit the changes.\n\nReview at: ${expenseUrl}`,
  }
}

export function generateAdminChangeRequestedEmail(
  recipientName: string,
  expenseTitle: string,
  amount: number,
  adminName: string,
  comment: string,
  baseUrl: string
): EmailTemplate {
  const appUrl = baseUrl
  const expenseUrl = `${appUrl}/expenses`

  return {
    to: '',
    subject: `Changes Requested for Expense: ${expenseTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Changes Requested for Your Expense</h2>
        <p>Hello ${recipientName},</p>
        <p>An admin has requested changes to your expense submission:</p>
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3>${expenseTitle}</h3>
          <p><strong>Amount:</strong> $${(amount / 100).toFixed(2)}</p>
          <p><strong>Requested by:</strong> ${adminName} (Admin)</p>
          <div style="background: #fff; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0;">
            <p><strong>Change Request:</strong></p>
            <p style="margin: 10px 0; font-style: italic;">"${comment}"</p>
          </div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${expenseUrl}" style="background: #ffc107; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Edit Your Expense
          </a>
        </div>
        <p>The expense status has been changed to "Change Requested" and you can now edit and resubmit your expense. Please make the requested changes and submit for approval.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `Changes Requested for Your Expense: ${expenseTitle}\n\nAmount: $${(amount / 100).toFixed(2)}\nRequested by: ${adminName} (Admin)\n\nChange Request: "${comment}"\n\nThe expense status has been changed to "Change Requested" and you can now edit and resubmit your expense. Please make the requested changes and submit for approval.\n\nEdit at: ${expenseUrl}`,
  }
}

export function generatePastorRemarkAddedEmail(
  recipientName: string,
  expenseTitle: string,
  pastorName: string,
  remark: string,
  campus: string,
  baseUrl: string
): EmailTemplate {
  const appUrl = baseUrl
  const expenseUrl = `${appUrl}/expenses`
  
  return {
    to: '',
    subject: `Pastor Remark Added to Expense: ${expenseTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Pastor Remark Added to Expense</h2>
        <p>Hello ${recipientName},</p>
        <p>A campus pastor has added a remark to an expense request:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${expenseTitle}</h3>
          <p><strong>Pastor:</strong> ${pastorName}</p>
          <p><strong>Campus:</strong> ${campus}</p>
          <div style="background: #fff; padding: 15px; border-left: 4px solid #007bff; margin: 15px 0;">
            <p><strong>Remark:</strong></p>
            <p style="margin: 10px 0; font-style: italic;">"${remark}"</p>
          </div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${expenseUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Expense Details
          </a>
        </div>
        <p>Please review the pastor's remark along with the expense request.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `Pastor Remark Added to Expense: ${expenseTitle}\n\nPastor: ${pastorName}\nCampus: ${campus}\n\nRemark: "${remark}"\n\nPlease review the pastor's remark along with the expense request at: ${expenseUrl}`,
  }
}

export function generateEmailVerificationEmail(
  recipientName: string,
  verificationUrl: string,
  baseUrl: string
): EmailTemplate {
  const appUrl = baseUrl
  
  return {
    to: '',
    subject: 'Verify Your Email Address - Church Expense System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Church Expense System</h2>
        <p>Hello ${recipientName},</p>
        <p>Thank you for registering with the Church Expense System. To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666; font-size: 14px;">${verificationUrl}</p>
        <p><strong>Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
        <p>If you didn't create an account with us, please ignore this email.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `Welcome to Church Expense System\n\nHello ${recipientName},\n\nThank you for registering with the Church Expense System. To complete your registration and activate your account, please verify your email address by visiting this link:\n\n${verificationUrl}\n\nThis verification link will expire in 24 hours for security reasons.\n\nIf you didn't create an account with us, please ignore this email.\n\nBest regards,\nChurch Expense System`,
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

export function generatePasswordResetEmail(
  recipientName: string,
  resetUrl: string,
  baseUrl: string
): EmailTemplate {
  const appUrl = baseUrl

  return {
    to: '',
    subject: 'Reset Your Password - Church Expense System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello ${recipientName},</p>
        <p>We received a request to reset your password for your Church Expense System account. Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>
        <p><strong>Important:</strong> This reset link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `Password Reset Request\n\nHello ${recipientName},\n\nWe received a request to reset your password for your Church Expense System account. Please visit this link to reset your password:\n\n${resetUrl}\n\nThis reset link will expire in 1 hour for security reasons.\n\nIf you didn't request a password reset, please ignore this email. Your password will remain unchanged.\n\nBest regards,\nChurch Expense System`,
  }
}

export function generateExpenseNoteAddedEmail(
  recipientName: string,
  expenseTitle: string,
  noteAuthorName: string,
  noteContent: string,
  baseUrl: string
): EmailTemplate {
  const appUrl = baseUrl
  const expenseUrl = `${appUrl}/expenses`

  return {
    to: '',
    subject: `New Note Added to Expense: ${expenseTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Note Added to Expense</h2>
        <p>Hello ${recipientName},</p>
        <p>A new note has been added to an expense request:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${expenseTitle}</h3>
          <p><strong>Note by:</strong> ${noteAuthorName}</p>
          <div style="background: #fff; padding: 15px; border-left: 4px solid #007bff; margin: 15px 0;">
            <p><strong>Note:</strong></p>
            <p style="margin: 10px 0; font-style: italic;">"${noteContent}"</p>
          </div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${expenseUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Expense Details
          </a>
        </div>
        <p>Please review the note and respond if necessary.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `New Note Added to Expense: ${expenseTitle}\n\nNote by: ${noteAuthorName}\n\nNote: "${noteContent}"\n\nPlease review the note at: ${expenseUrl}`,
  }
}

export function generateReportNoteAddedEmail(
  recipientName: string,
  reportTitle: string,
  noteAuthorName: string,
  noteContent: string,
  baseUrl: string
): EmailTemplate {
  const appUrl = baseUrl
  const reportsUrl = `${appUrl}/reports`

  return {
    to: '',
    subject: `New Note Added to Report: ${reportTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Note Added to Report</h2>
        <p>Hello ${recipientName},</p>
        <p>A new note has been added to an expense report:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${reportTitle}</h3>
          <p><strong>Note by:</strong> ${noteAuthorName}</p>
          <div style="background: #fff; padding: 15px; border-left: 4px solid #007bff; margin: 15px 0;">
            <p><strong>Note:</strong></p>
            <p style="margin: 10px 0; font-style: italic;">"${noteContent}"</p>
          </div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${reportsUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Report Details
          </a>
        </div>
        <p>Please review the note and respond if necessary.</p>
        <p>Best regards,<br>Church Expense System</p>
      </div>
    `,
    text: `New Note Added to Report: ${reportTitle}\n\nNote by: ${noteAuthorName}\n\nNote: "${noteContent}"\n\nPlease review the note at: ${reportsUrl}`,
  }
}

export function generateErrorNotificationEmail(
  errorMessage: string,
  endpoint: string,
  userId?: string,
  stackTrace?: string
): EmailTemplate {
  return {
    to: 'madeyinka6@gmail.com',
    subject: `🚨 500 Error Alert - Church Expense System`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">500 Internal Server Error</h2>
        <p>A 500 error has occurred in the Church Expense System:</p>

        <div style="background: #ffeaea; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3 style="margin-top: 0;">Error Details</h3>
          <p><strong>Endpoint:</strong> ${endpoint}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>User ID:</strong> ${userId || 'Not available'}</p>
          <p><strong>Error Message:</strong></p>
          <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap;">${errorMessage}</pre>
          ${stackTrace ? `
            <p><strong>Stack Trace:</strong></p>
            <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; font-size: 12px;">${stackTrace}</pre>
          ` : ''}
        </div>

        <p style="color: #6c757d; font-size: 14px;">
          This is an automated notification. Please investigate the issue immediately.
        </p>

        <p>Best regards,<br>Church Expense System Monitoring</p>
      </div>
    `,
    text: `500 Error Alert - Church Expense System\n\nA 500 error has occurred:\n\nEndpoint: ${endpoint}\nTimestamp: ${new Date().toISOString()}\nUser ID: ${userId || 'Not available'}\nError Message: ${errorMessage}\n${stackTrace ? `Stack Trace: ${stackTrace}\n` : ''}\nPlease investigate the issue immediately.`,
  }
}

// Utility function to send error notification email
export async function sendErrorNotification(
  error: Error,
  endpoint: string,
  userId?: string
): Promise<boolean> {
  try {
    const errorTemplate = generateErrorNotificationEmail(
      error.message,
      endpoint,
      userId,
      error.stack
    )

    return await sendEmail(errorTemplate)
  } catch (emailError) {
    console.error('Failed to send error notification email:', emailError)
    return false
  }
}
