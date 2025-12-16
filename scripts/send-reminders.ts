import { PrismaClient } from '@prisma/client'
import { sendEmail, generateReminderEmail } from '../src/lib/email'
import { sendSMS, generateReminderSMS } from '../src/lib/sms'

const db = new PrismaClient()

async function sendReminders() {
  try {
    console.log('Starting reminder process...')

    // Get settings
    const settings = await db.setting.findFirst()
    const reminderHours = settings?.reminderHours || 48

    // Calculate cutoff time
    const cutoffTime = new Date(Date.now() - reminderHours * 60 * 60 * 1000)

    // Find stale submitted expenses
    const staleExpenses = await db.expenseRequest.findMany({
      where: {
        status: 'SUBMITTED',
        createdAt: {
          lte: cutoffTime,
        },
      },
      include: {
        requester: true,
      },
    })

    console.log(`Found ${staleExpenses.length} stale expenses`)

    // Get admins for reminders (exclude suspended users)
    // Campus pastors only get notified on creation and final approval, not reminders
    const approvers = await db.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE', // Only send to active users
      },
    })

    // Send reminders to admins only
    for (const approver of approvers) {
      const pendingCount = await db.expenseRequest.count({
        where: {
          status: 'SUBMITTED',
        },
      })

      if (pendingCount > 0) {
        // Send email reminder
        const emailTemplate = generateReminderEmail(
          approver.name || approver.email,
          pendingCount
        )
        emailTemplate.to = approver.email
        await sendEmail(emailTemplate)

        // Send SMS reminder (if phone number available)
        // const smsTemplate = generateReminderSMS(pendingCount)
        // smsTemplate.to = approver.phone
        // await sendSMS(smsTemplate)

        console.log(`Sent reminder to ${approver.email}`)
      }
    }

    // Log reminder notifications
    for (const expense of staleExpenses) {
      await db.notification.create({
        data: {
          expenseId: expense.id,
          userId: expense.requesterId,
          kind: 'reminder',
          channel: 'email',
          payload: {
            expenseTitle: expense.title,
            amount: expense.amountCents,
            daysOld: Math.floor((Date.now() - expense.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
          },
          status: 'sent',
          sentAt: new Date(),
        },
      })
    }

    console.log('Reminder process completed successfully')
  } catch (error) {
    console.error('Error in reminder process:', error)
  } finally {
    await db.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  sendReminders()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { sendReminders }
