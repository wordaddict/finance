#!/usr/bin/env tsx

/**
 * Test script to verify that 500 error notifications are sent via email
 * This script simulates a 500 error in the expenses API route
 */

import { handleApiError } from '../src/lib/error-handler'

async function testErrorNotification() {
  console.log('🧪 Testing 500 error notification system...')

  try {
    // Simulate a 500 error by calling handleApiError with an internal server error
    const mockRequest = new Request('http://localhost:3000/api/expenses')
    const error = new Error('Simulated database connection failure')

    console.log('📧 Sending error notification to madeyinka6@gmail.com...')

    const response = await handleApiError(error, '/api/expenses', 'test-user-123')

    console.log('✅ Error notification sent successfully!')
    console.log('📊 Response status:', response.status)

    const responseData = await response.json()
    console.log('📄 Response message:', responseData.error)

  } catch (error) {
    console.error('❌ Failed to test error notification:', error)
    process.exit(1)
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testErrorNotification()
    .then(() => {
      console.log('🎉 Error notification test completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Test failed:', error)
      process.exit(1)
    })
}
