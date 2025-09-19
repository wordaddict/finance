import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ProfileClient } from './profile-client'

export default async function ProfilePage() {
  const user = await requireAuth()
  
  if (!user) {
    redirect('/login')
  }

  return <ProfileClient user={user} />
}
