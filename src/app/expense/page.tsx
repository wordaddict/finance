import Link from 'next/link'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { ExpensesList } from '@/components/expenses-list'
import { getCurrentUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export default async function ExpensesPage() {
  const user = await getCurrentUser()
  
  return (
    <AuthenticatedLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-4 mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Finance Processing & Policy</p>
            <p className="text-sm text-gray-600">Review guidelines before submitting expenses.</p>
          </div>
          <Button asChild size="lg" variant="outline" className="border-red-200 text-gray-900 hover:border-red-300 hover:bg-red-50">
            <Link href="/finance-policy">View Finance Policy</Link>
          </Button>
        </div>
      </div>
      <ExpensesList user={user!} />
    </AuthenticatedLayout>
  )
}
