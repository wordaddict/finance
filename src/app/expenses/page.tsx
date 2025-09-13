import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { ExpensesList } from '@/components/expenses-list'
import { getCurrentUser } from '@/lib/auth'

export default async function ExpensesPage() {
  const user = await getCurrentUser()
  
  return (
    <AuthenticatedLayout>
      <ExpensesList user={user!} />
    </AuthenticatedLayout>
  )
}
