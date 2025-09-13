import { requireAuth } from '@/lib/auth'
import UsersPageClient from './users-client'

export default async function UsersPage() {
  const user = await requireAuth()
  
  return <UsersPageClient user={user} />
}