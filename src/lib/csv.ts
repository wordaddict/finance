import { URGENCY_DISPLAY_NAMES, TEAM_DISPLAY_NAMES, CAMPUS_DISPLAY_NAMES, STATUS_DISPLAY_NAMES, ACCOUNT_DISPLAY_NAMES } from './constants'

export interface ExpenseWithDetails {
  id: string
  title: string
  amountCents: number
  team: string
  requesterId: string
  description: string | null
  category: string | null
  urgency: number
  notes: string | null
  status: string
  paidAt: Date | null
  paymentDate: Date | null
  paidAmountCents: number | null
  paidBy: string | null
  eventDate: Date | null
  eventName: string | null
  fullEventBudgetCents: number | null
  reportRequired: boolean
  account: string | null
  expenseType: string | null
  createdAt: Date
  updatedAt: Date
  campus: string
  requester: {
    id: string
    name: string | null
    email: string
    zelle: string | null
  }
  items?: Array<{
    id: string
    description: string
    category: string | null
    quantity: number
    unitPriceCents: number
    amountCents: number
    approvals?: Array<{
      id: string
      status: string
      approvedAmountCents: number | null
      comment: string | null
      approver: {
        name: string | null
        email: string
      }
      createdAt: Date
    }>
  }>
  approvals?: Array<{
    id: string
    stage: number
    decision: string | null
    comment: string | null
    decidedAt: Date | null
    approver: {
      name: string | null
      email: string
    }
  }>
  pastorRemarks?: Array<{
    id: string
    remark: string
    pastor: {
      name: string | null
      email: string
    }
    createdAt: Date
  }>
  reports?: Array<{
    id: string
    totalApprovedAmount: number | null
    createdAt: Date
    notes?: Array<{
      id: string
      note: string
      author: {
        name: string | null
        email: string
      }
      createdAt: Date
    }>
  }>
  attachments?: Array<{
    id: string
    publicId: string
    secureUrl: string
    mimeType: string
    itemId: string | null
  }>
}

export function generateCSV(expenses: ExpenseWithDetails[]): string {
  // Use the same comprehensive format as streamCSV
  const lines: string[] = []
  
  // Write headers
  const headers = [
    'ID',
    'Title',
    'Amount ($)',
    'Team',
    'Campus',
    'Requester Name',
    'Requester Email',
    'Requester Zelle',
    'Description',
    'Category',
    'Urgency',
    'Status',
    'Account',
    'Expense Type',
    'Event Date',
    'Event Name',
    'Full Event Budget ($)',
    'Report Required',
    'Paid Amount ($)',
    'Payment Date',
    'Paid By',
    'Created At',
    'Updated At',
    'Paid At',
    'Items Count',
    'Items Details',
    'Attachments Count',
    'Approvals Count',
    'Approvals Details',
    'Pastor Remarks Count',
    'Pastor Remarks Details',
    'Reports Count',
    'Reports Details',
    'Notes',
  ]
  lines.push(headers.join(','))

  // Write data rows
  for (const expense of expenses) {
    const itemsCount = expense.items?.length || 0
    const itemsDetails = expense.items?.map(item => {
      const approvals = item.approvals?.map(a => 
        `${a.approver.name || a.approver.email}: ${a.status} ($${(a.approvedAmountCents || 0) / 100})`
      ).join('; ') || ''
      return `${item.description} (Qty: ${item.quantity}, Unit: $${(item.unitPriceCents / 100).toFixed(2)}, Total: $${(item.amountCents / 100).toFixed(2)})${approvals ? ` [Approvals: ${approvals}]` : ''}`
    }).join(' | ') || ''

    const attachmentsCount = expense.attachments?.length || 0

    const approvalsCount = expense.approvals?.length || 0
    const approvalsDetails = expense.approvals?.map(a => 
      `${a.approver.name || a.approver.email}: Stage ${a.stage} - ${a.decision || 'PENDING'}${a.decidedAt ? ` (${a.decidedAt.toISOString().split('T')[0]})` : ''}${a.comment ? ` - ${a.comment}` : ''}`
    ).join(' | ') || ''

    const pastorRemarksCount = expense.pastorRemarks?.length || 0
    const pastorRemarksDetails = expense.pastorRemarks?.map(r => 
      `${r.pastor.name || r.pastor.email}: ${r.remark}`
    ).join(' | ') || ''

    const reportsCount = expense.reports?.length || 0
    const reportsDetails = expense.reports?.map(r => {
      const reportNotes = r.notes?.map(n => 
        `${n.author.name || n.author.email}: ${n.note}`
      ).join('; ') || ''
      const approvedAmount = r.totalApprovedAmount ? (r.totalApprovedAmount / 100).toFixed(2) : '0.00'
      return `Report #${r.id}: $${approvedAmount}${reportNotes ? ` [Notes: ${reportNotes}]` : ''}`
    }).join(' | ') || ''

    const row = [
      expense.id,
      escapeCSV(expense.title),
      (expense.amountCents / 100).toFixed(2),
      escapeCSV(TEAM_DISPLAY_NAMES[expense.team as keyof typeof TEAM_DISPLAY_NAMES] || expense.team),
      escapeCSV(CAMPUS_DISPLAY_NAMES[expense.campus as keyof typeof CAMPUS_DISPLAY_NAMES] || expense.campus),
      escapeCSV(expense.requester.name || ''),
      escapeCSV(expense.requester.email),
      escapeCSV(expense.requester.zelle || ''),
      escapeCSV(expense.description || ''),
      escapeCSV(expense.category || ''),
      escapeCSV(URGENCY_DISPLAY_NAMES[expense.urgency as keyof typeof URGENCY_DISPLAY_NAMES] || expense.urgency.toString()),
      escapeCSV(STATUS_DISPLAY_NAMES[expense.status as keyof typeof STATUS_DISPLAY_NAMES] || expense.status),
      escapeCSV(expense.account ? ACCOUNT_DISPLAY_NAMES[expense.account as keyof typeof ACCOUNT_DISPLAY_NAMES] || expense.account : ''),
      escapeCSV(expense.expenseType || ''),
      expense.eventDate ? expense.eventDate.toISOString().split('T')[0] : '',
      escapeCSV(expense.eventName || ''),
      expense.fullEventBudgetCents ? (expense.fullEventBudgetCents / 100).toFixed(2) : '',
      expense.reportRequired ? 'Yes' : 'No',
      expense.paidAmountCents ? (expense.paidAmountCents / 100).toFixed(2) : '',
      expense.paymentDate ? expense.paymentDate.toISOString().split('T')[0] : '',
      escapeCSV(expense.paidBy || ''),
      expense.createdAt.toISOString(),
      expense.updatedAt.toISOString(),
      expense.paidAt ? expense.paidAt.toISOString() : '',
      itemsCount.toString(),
      escapeCSV(itemsDetails),
      attachmentsCount.toString(),
      approvalsCount.toString(),
      escapeCSV(approvalsDetails),
      pastorRemarksCount.toString(),
      escapeCSV(pastorRemarksDetails),
      reportsCount.toString(),
      escapeCSV(reportsDetails),
      escapeCSV(expense.notes || ''),
    ]
    lines.push(row.join(','))
  }

  return lines.join('\n')
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function streamCSV(
  expenses: ExpenseWithDetails[],
  write: (chunk: string) => void
): void {
  // Write comprehensive headers
  const headers = [
    'ID',
    'Title',
    'Amount ($)',
    'Team',
    'Campus',
    'Requester Name',
    'Requester Email',
    'Requester Zelle',
    'Description',
    'Category',
    'Urgency',
    'Status',
    'Account',
    'Expense Type',
    'Event Date',
    'Event Name',
    'Full Event Budget ($)',
    'Report Required',
    'Paid Amount ($)',
    'Payment Date',
    'Paid By',
    'Created At',
    'Updated At',
    'Paid At',
    'Items Count',
    'Items Details',
    'Attachments Count',
    'Approvals Count',
    'Approvals Details',
    'Pastor Remarks Count',
    'Pastor Remarks Details',
    'Reports Count',
    'Reports Details',
    'Notes',
  ]
  write(headers.join(',') + '\n')

  // Write data rows
  for (const expense of expenses) {
    // Format items
    const itemsCount = expense.items?.length || 0
    const itemsDetails = expense.items?.map(item => {
      const approvals = item.approvals?.map(a => 
        `${a.approver.name || a.approver.email}: ${a.status} ($${(a.approvedAmountCents || 0) / 100})`
      ).join('; ') || ''
      return `${item.description} (Qty: ${item.quantity}, Unit: $${(item.unitPriceCents / 100).toFixed(2)}, Total: $${(item.amountCents / 100).toFixed(2)})${approvals ? ` [Approvals: ${approvals}]` : ''}`
    }).join(' | ') || ''

    // Format attachments
    const attachmentsCount = expense.attachments?.length || 0

    // Format approvals
    const approvalsCount = expense.approvals?.length || 0
    const approvalsDetails = expense.approvals?.map(a => 
      `${a.approver.name || a.approver.email}: Stage ${a.stage} - ${a.decision || 'PENDING'}${a.decidedAt ? ` (${a.decidedAt.toISOString().split('T')[0]})` : ''}${a.comment ? ` - ${a.comment}` : ''}`
    ).join(' | ') || ''

    // Format pastor remarks
    const pastorRemarksCount = expense.pastorRemarks?.length || 0
    const pastorRemarksDetails = expense.pastorRemarks?.map(r => 
      `${r.pastor.name || r.pastor.email}: ${r.remark}`
    ).join(' | ') || ''

    // Format reports
    const reportsCount = expense.reports?.length || 0
    const reportsDetails = expense.reports?.map(r => {
      const reportNotes = r.notes?.map(n => 
        `${n.author.name || n.author.email}: ${n.note}`
      ).join('; ') || ''
      const approvedAmount = r.totalApprovedAmount ? (r.totalApprovedAmount / 100).toFixed(2) : '0.00'
      return `Report #${r.id}: $${approvedAmount}${reportNotes ? ` [Notes: ${reportNotes}]` : ''}`
    }).join(' | ') || ''

    const row = [
      expense.id,
      escapeCSV(expense.title),
      (expense.amountCents / 100).toFixed(2),
      escapeCSV(TEAM_DISPLAY_NAMES[expense.team as keyof typeof TEAM_DISPLAY_NAMES] || expense.team),
      escapeCSV(CAMPUS_DISPLAY_NAMES[expense.campus as keyof typeof CAMPUS_DISPLAY_NAMES] || expense.campus),
      escapeCSV(expense.requester.name || ''),
      escapeCSV(expense.requester.email),
      escapeCSV(expense.requester.zelle || ''),
      escapeCSV(expense.description || ''),
      escapeCSV(expense.category || ''),
      escapeCSV(URGENCY_DISPLAY_NAMES[expense.urgency as keyof typeof URGENCY_DISPLAY_NAMES] || expense.urgency.toString()),
      escapeCSV(STATUS_DISPLAY_NAMES[expense.status as keyof typeof STATUS_DISPLAY_NAMES] || expense.status),
      escapeCSV(expense.account ? ACCOUNT_DISPLAY_NAMES[expense.account as keyof typeof ACCOUNT_DISPLAY_NAMES] || expense.account : ''),
      escapeCSV(expense.expenseType || ''),
      expense.eventDate ? expense.eventDate.toISOString().split('T')[0] : '',
      escapeCSV(expense.eventName || ''),
      expense.fullEventBudgetCents ? (expense.fullEventBudgetCents / 100).toFixed(2) : '',
      expense.reportRequired ? 'Yes' : 'No',
      expense.paidAmountCents ? (expense.paidAmountCents / 100).toFixed(2) : '',
      expense.paymentDate ? expense.paymentDate.toISOString().split('T')[0] : '',
      escapeCSV(expense.paidBy || ''),
      expense.createdAt.toISOString(),
      expense.updatedAt.toISOString(),
      expense.paidAt ? expense.paidAt.toISOString() : '',
      itemsCount.toString(),
      escapeCSV(itemsDetails),
      attachmentsCount.toString(),
      approvalsCount.toString(),
      escapeCSV(approvalsDetails),
      pastorRemarksCount.toString(),
      escapeCSV(pastorRemarksDetails),
      reportsCount.toString(),
      escapeCSV(reportsDetails),
      escapeCSV(expense.notes || ''),
    ]
    write(row.join(',') + '\n')
  }
}

export function getCSVFilename(prefix: string = 'expenses', filters?: {
  team?: string
  campus?: string
  status?: string
  startDate?: string
  endDate?: string
}): string {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const parts = [prefix, dateStr]
  
  if (filters) {
    if (filters.team) parts.push(`team-${filters.team}`)
    if (filters.campus) parts.push(`campus-${filters.campus}`)
    if (filters.status) parts.push(`status-${filters.status}`)
    if (filters.startDate) parts.push(`from-${filters.startDate}`)
    if (filters.endDate) parts.push(`to-${filters.endDate}`)
  }
  
  return `${parts.join('_')}.csv`
}
