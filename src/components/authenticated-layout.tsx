import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Navigation } from './navigation'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export async function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      <main className="container mx-auto">
        {children}
      </main>
    </div>
  )
}
