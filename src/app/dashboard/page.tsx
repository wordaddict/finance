import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { Dashboard } from '@/components/dashboard'
import { getCurrentUser } from '@/lib/auth'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  
  return (
    <AuthenticatedLayout>
      <Dashboard user={user!} />
    </AuthenticatedLayout>
  )
}
