import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailTemplate {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(template: EmailTemplate): Promise<boolean> {
  if (process.env.DISABLE_EMAIL_NOTIFICATIONS === 'true') {
    console.log('Email notifications disabled. Would send:', template)
    return true
  }

  if (!process.env.RESEND_API_KEY) {
    console.log('Resend not configured. Would send:', template)
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
