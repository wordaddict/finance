import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// IDs created by prisma/dmv-seed.ts so we can safely delete only that data
const DMV_WISHLIST_IDS = [
  'wishlist-001',
  'wishlist-002',
  'wishlist-003',
  'wishlist-004',
  'wishlist-005',
  'wishlist-006',
  'wishlist-007',
  'wishlist-008',
  'wishlist-009',
  'wishlist-010',
  'wishlist-011',
  'wishlist-012',
  'wishlist-013',
  'wishlist-014',
  'wishlist-015',
  'wishlist-016',
  'wishlist-017',
  'wishlist-018',
  'wishlist-019',
  'wishlist-020',
]

async function main() {
  console.log('🧹 Deleting CCI DMV Building Move Wish List seed items...')

  const result = await prisma.wishlistItem.deleteMany({
    where: {
      id: {
        in: DMV_WISHLIST_IDS,
      },
    },
  })

  console.log(`✅ Removed ${result.count} wish list items seeded by db:dmv-seed`)
  console.log('🎯 IDs cleared:', DMV_WISHLIST_IDS.join(', '))
}

main()
  .catch((e) => {
    console.error('❌ Error deleting DMV wish list seed data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

