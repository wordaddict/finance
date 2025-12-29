import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding CCI DMV Building Move Wish List items...')

  // Create CCI DMV Building Move Wish List items
  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-001' },
    update: {},
    create: {
      id: 'wishlist-001',
      title: 'Washing of the Chairs',
      description: 'Professional cleaning service for all church chairs and seating.',
      category: 'Maintenance',
      priceCents: 150000, // $1,500.00
      currency: 'USD',
      quantityNeeded: 1,
      purchaseUrl: 'https://www.angieslist.com/companylist/us/va/reston/upholstery-cleaning.htm',
      imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
      priority: 3,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-002' },
    update: {},
    create: {
      id: 'wishlist-002',
      title: 'Tables for Welfare',
      description: 'Tables for the welfare ministry area to serve our community.',
      category: 'Furniture',
      priceCents: 30000, // $300.00 each
      currency: 'USD',
      quantityNeeded: 6,
      purchaseUrl: 'https://www.amazon.com/s?k=folding+tables+for+church',
      imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
      priority: 3,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-003' },
    update: {},
    create: {
      id: 'wishlist-003',
      title: 'Feather Flag',
      description: 'Professional feather flag for outdoor church signage and visibility.',
      category: 'Signage',
      priceCents: 15000, // $150.00
      currency: 'USD',
      quantityNeeded: 1,
      purchaseUrl: 'https://www.amazon.com/s?k=feather+flag+church+sign',
      imageUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
      priority: 3,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-004' },
    update: {},
    create: {
      id: 'wishlist-004',
      title: 'Keyboard CCW',
      description: 'Keyboard for Celebration Church Worship music ministry.',
      category: 'Music',
      priceCents: 8000, // $80.00
      currency: 'USD',
      quantityNeeded: 1,
      purchaseUrl: 'https://www.amazon.com/s?k=digital+piano+keyboard',
      imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&h=300&fit=crop',
      priority: 2,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-005' },
    update: {},
    create: {
      id: 'wishlist-005',
      title: 'Signage and Parking',
      description: 'Professional signage and parking solutions for the new building.',
      category: 'Signage',
      priceCents: 50000, // $500.00
      currency: 'USD',
      quantityNeeded: 1,
      purchaseUrl: 'https://www.homedepot.com/s/signage',
      imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
      priority: 3,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-006' },
    update: {},
    create: {
      id: 'wishlist-006',
      title: 'Coffee Maker',
      description: 'Commercial grade coffee maker for fellowship gatherings.',
      category: 'Kitchen',
      priceCents: 15000, // $150.00
      currency: 'USD',
      quantityNeeded: 1,
      purchaseUrl: 'https://www.amazon.com/Programmable-Coffee-Maker-Auto-Shut-Off/dp/B07ZJZ7Q8L',
      imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
      priority: 1,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-007' },
    update: {},
    create: {
      id: 'wishlist-007',
      title: 'First Aid Kit',
      description: 'Complete first aid kit for emergency preparedness.',
      category: 'Safety',
      priceCents: 5000, // $50.00
      currency: 'USD',
      quantityNeeded: 2,
      purchaseUrl: 'https://www.amazon.com/s?k=first+aid+kit+professional',
      imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
      priority: 1,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-008' },
    update: {},
    create: {
      id: 'wishlist-008',
      title: 'Camera (CCTV)',
      description: 'Security camera system for building surveillance.',
      category: 'Security',
      priceCents: 20000, // $200.00
      currency: 'USD',
      quantityNeeded: 1,
      purchaseUrl: 'https://www.amazon.com/s?k=cctv+security+camera+system',
      imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop',
      priority: 1,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-009' },
    update: {},
    create: {
      id: 'wishlist-009',
      title: 'Internet',
      description: 'High-speed internet setup for the new building.',
      category: 'Technology',
      priceCents: 10000, // $100.00 (setup fee)
      currency: 'USD',
      quantityNeeded: 1,
      purchaseUrl: 'https://www.verizon.com/business/internet/',
      imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=300&fit=crop',
      priority: 3,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-010' },
    update: {},
    create: {
      id: 'wishlist-010',
      title: 'Children Chairs',
      description: 'Child-sized chairs for our children\'s ministry spaces.',
      category: 'Furniture',
      priceCents: 2500, // $25.00 each
      currency: 'USD',
      quantityNeeded: 20,
      purchaseUrl: 'https://www.amazon.com/s?k=childrens+chairs+for+church',
      imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
      priority: 3,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-011' },
    update: {},
    create: {
      id: 'wishlist-011',
      title: 'Table for Pastor\'s Office',
      description: 'Professional desk for the pastor\'s office space.',
      category: 'Furniture',
      priceCents: 40000, // $400.00
      currency: 'USD',
      quantityNeeded: 1,
      purchaseUrl: 'https://www.amazon.com/s?k=office+desk+pastor',
      imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
      priority: 1,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-012' },
    update: {},
    create: {
      id: 'wishlist-012',
      title: 'Bins',
      description: 'Storage bins for organizing supplies and materials.',
      category: 'Storage',
      priceCents: 1500, // $15.00 each
      currency: 'USD',
      quantityNeeded: 10,
      purchaseUrl: 'https://www.amazon.com/s?k=storage+bins+church+supplies',
      imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
      priority: 3,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-013' },
    update: {},
    create: {
      id: 'wishlist-013',
      title: 'Close Unused Rooms',
      description: 'Materials and supplies to properly close and secure unused rooms.',
      category: 'Maintenance',
      priceCents: 5000, // $50.00
      currency: 'USD',
      quantityNeeded: 1,
      purchaseUrl: 'https://www.homedepot.com/s/room+closure',
      imageUrl: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=400&h=300&fit=crop',
      priority: 3,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-014' },
    update: {},
    create: {
      id: 'wishlist-014',
      title: 'Tables for Media',
      description: 'Tables for the media ministry production area.',
      category: 'Furniture',
      priceCents: 25000, // $250.00 each
      currency: 'USD',
      quantityNeeded: 2,
      purchaseUrl: 'https://www.amazon.com/s?k=media+production+tables',
      imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
      priority: 3,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-015' },
    update: {},
    create: {
      id: 'wishlist-015',
      title: 'Power Washing',
      description: 'Professional power washing service for the building exterior.',
      category: 'Maintenance',
      priceCents: 75000, // $750.00
      currency: 'USD',
      quantityNeeded: 1,
      purchaseUrl: 'https://www.angieslist.com/companylist/us/va/reston/power-washing.htm',
      imageUrl: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop',
      priority: 3,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-016' },
    update: {},
    create: {
      id: 'wishlist-016',
      title: 'Microwave',
      description: 'Commercial microwave for the kitchen area.',
      category: 'Kitchen',
      priceCents: 8000, // $80.00
      currency: 'USD',
      quantityNeeded: 1,
      purchaseUrl: 'https://www.amazon.com/s?k=commercial+microwave',
      imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
      priority: 1,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-017' },
    update: {},
    create: {
      id: 'wishlist-017',
      title: 'Sound (Vision and Volume)',
      description: 'Professional sound system for worship services.',
      category: 'Audio',
      priceCents: 200000, // $2,000.00
      currency: 'USD',
      quantityNeeded: 1,
      purchaseUrl: 'https://www.amazon.com/s?k=church+sound+system',
      imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&h=300&fit=crop',
      priority: 3,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-018' },
    update: {},
    create: {
      id: 'wishlist-018',
      title: 'Ambience (Interior Decor, Lighting and Bathrooms)',
      description: 'Interior decoration, ambience lighting, and bathroom improvements.',
      category: 'Decor',
      priceCents: 150000, // $1,500.00
      currency: 'USD',
      quantityNeeded: 1,
      purchaseUrl: 'https://www.homedepot.com/c/interior_decor_and_lighting',
      imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
      priority: 2,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-019' },
    update: {},
    create: {
      id: 'wishlist-019',
      title: 'LED Screen',
      description: 'Large LED screen for worship services and presentations.',
      category: 'Technology',
      priceCents: 500000, // $5,000.00
      currency: 'USD',
      quantityNeeded: 1,
      purchaseUrl: 'https://www.amazon.com/s?k=led+screen+church',
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
      priority: 3,
      isActive: true,
    },
  })

  await prisma.wishlistItem.upsert({
    where: { id: 'wishlist-020' },
    update: {},
    create: {
      id: 'wishlist-020',
      title: 'Signage - Celebrate Center Logo',
      description: 'Professional signage featuring the Celebrate Center logo.',
      category: 'Signage',
      priceCents: 30000, // $300.00
      currency: 'USD',
      quantityNeeded: 1,
      purchaseUrl: 'https://www.homedepot.com/s/custom+signage',
      imageUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
      priority: 2,
      isActive: true,
    },
  })

  console.log('✅ CCI DMV Building Move Wish List items seeded successfully!')
  console.log('📋 20 items added to the wish list')
  console.log('🏠 Visit /dmv to see the wish list')
  console.log('⚙️  Login as admin to manage items at /admin/wishlist')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding DMV wish list:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
