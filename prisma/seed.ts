import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create default settings
  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      requireTwoStage: false,
      reminderHours: 48,
    },
  })

  // Teams are now enums, no need to create them

  // Create admin user
  const adminPassword = await hashPassword('admin123')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@church.com' },
    update: {},
    create: {
      email: 'admin@church.com',
      name: 'Church Admin',
      role: 'ADMIN',
      campus: 'DMV',
      password: adminPassword,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  })

  // Create campus pastor
  const pastorPassword = await hashPassword('pastor123')
  const pastor = await prisma.user.upsert({
    where: { email: 'pastor@church.com' },
    update: {},
    create: {
      email: 'pastor@church.com',
      name: 'Campus Pastor',
      role: 'CAMPUS_PASTOR',
      campus: 'DMV',
      password: pastorPassword,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  })

  // Create sample leader
  const leaderPassword = await hashPassword('leader123')
  const leader = await prisma.user.upsert({
    where: { email: 'leader@church.com' },
    update: {},
    create: {
      email: 'leader@church.com',
      name: 'Team Leader',
      role: 'LEADER',
      campus: 'DMV',
      password: leaderPassword,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  })

  // Team memberships are no longer needed since teams are enums

  // Create sample expense requests for testing

  await prisma.expenseRequest.upsert({
    where: { id: '550e8400-e29b-41d4-a716-446655440002' },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440002',
      title: 'Worship Team Equipment',
      amountCents: 25000, // $250.00
      status: 'SUBMITTED',
      urgency: 3,
      campus: 'BOSTON',
      description: 'New microphone and audio cables for worship team',
      category: 'Equipment Purchase',
      requesterId: pastor.id,
      team: 'CREATIVE',
    },
  })

  await prisma.expenseRequest.upsert({
    where: { id: '550e8400-e29b-41d4-a716-446655440003' },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440003',
      title: 'Office Supplies',
      amountCents: 5000, // $50.00
      status: 'APPROVED',
      urgency: 2,
      campus: 'DMV',
      description: 'Paper, pens, and other office supplies',
      category: 'Administrative Expenses',
      requesterId: admin.id,
      team: 'ADMIN',
    },
  })

  console.log('Seed completed successfully!')
  console.log('Default users created:')
  console.log('Admin: admin@church.com / admin123')
  console.log('Pastor: pastor@church.com / pastor123')
  console.log('Leader: leader@church.com / leader123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
