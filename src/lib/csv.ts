import { URGENCY_DISPLAY_NAMES } from './constants'

export interface ExpenseWithDetails {
  id: string
  title: string
  amountCents: number
  team: string
  requesterId: string
  description: string | null
  urgency: number
  notes: string | null
  status: string
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
  campus: string
  requester: {
    id: string
    name: string | null
    email: string
  }
}

export function generateCSV(expenses: ExpenseWithDetails[]): string {
  const headers = [
    'ID',
    'Title',
    'Amount',
    'Team',
    'Requester',
    'Description',
    'Urgency',
    'Status',
    'Created At',
    'Updated At',
    'Paid At',
  ]

  const rows = expenses.map(expense => [
    expense.id,
    `"${expense.title.replace(/"/g, '""')}"`,
    (expense.amountCents / 100).toFixed(2),
    `"${expense.team.replace(/"/g, '""')}"`,
    `"${expense.requester.name || expense.requester.email}"`,
    `"${(expense.description || '').replace(/"/g, '""')}"`,
    URGENCY_DISPLAY_NAMES[expense.urgency as keyof typeof URGENCY_DISPLAY_NAMES] || expense.urgency.toString(),
    expense.status,
    expense.createdAt.toISOString(),
    expense.updatedAt.toISOString(),
    expense.paidAt?.toISOString() || '',
  ])

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}

export function streamCSV(
  expenses: ExpenseWithDetails[],
  write: (chunk: string) => void
): void {
  // Write headers
  const headers = [
    'ID',
    'Title',
    'Amount',
    'Team',
    'Requester',
    'Description',
    'Urgency',
    'Status',
    'Created At',
    'Updated At',
    'Paid At',
  ]
  write(headers.join(',') + '\n')

  // Write data rows
  for (const expense of expenses) {
    const row = [
      expense.id,
      `"${expense.title.replace(/"/g, '""')}"`,
      (expense.amountCents / 100).toFixed(2),
      `"${expense.team.replace(/"/g, '""')}"`,
      `"${expense.requester.name || expense.requester.email}"`,
      `"${(expense.description || '').replace(/"/g, '""')}"`,
      URGENCY_DISPLAY_NAMES[expense.urgency as keyof typeof URGENCY_DISPLAY_NAMES] || expense.urgency.toString(),
      expense.status,
      expense.createdAt.toISOString(),
      expense.updatedAt.toISOString(),
      expense.paidAt?.toISOString() || '',
    ]
    write(row.join(',') + '\n')
  }
}

export function getCSVFilename(prefix: string = 'expenses'): string {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  return `${prefix}_${dateStr}.csv`
}
