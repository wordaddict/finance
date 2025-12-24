import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ReportsPageClient from './reports-client'

export default async function ReportsPage() {
  const user = await requireAuth()

  // Only admins can access reports page
  if (user.role !== 'ADMIN') {
    redirect('/expense')
  }

  return <ReportsPageClient user={user} />
}
