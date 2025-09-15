import { requireAuth } from '@/lib/auth'
import ReportsPageClient from './reports-client'

export default async function ReportsPage() {
  const user = await requireAuth()

  return <ReportsPageClient user={user} />
}
