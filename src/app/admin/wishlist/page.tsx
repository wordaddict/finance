import { redirect } from 'next/navigation'
import { getCurrentUser, WISHLIST_ADMIN_USER_ID } from '@/lib/auth'
import { AdminWishlistManager } from '@/components/admin-wishlist-manager'

export const metadata = {
  title: 'Manage Wish List - CCI Admin',
  description: 'Admin interface for managing the building wish list',
}

export default async function AdminWishlistPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Restrict to the single authorized wishlist admin user
  if (user.id !== WISHLIST_ADMIN_USER_ID) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Building Wish List</h1>
          <p className="text-gray-600 mt-2">
            Add, edit, and manage items for the CCI DMV building wish list.
          </p>
        </div>

        <AdminWishlistManager />
      </div>
    </div>
  )
}
