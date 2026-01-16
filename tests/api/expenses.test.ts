import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET } from '@/app/api/expenses/route'
import { POST as adminChangeRequestPost } from '@/app/api/expenses/admin-change-request/route'
import { POST as requestChangePost } from '@/app/api/expenses/request-change/route'
import { PUT as updateExpensePut } from '@/app/api/expenses/update/route'
import { POST as approvePost } from '@/app/api/expenses/approve/route'
import { db } from '@/lib/db'

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    expenseRequest: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    expenseNote: {
      create: vi.fn(),
    },
    statusEvent: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    approval: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    expenseItemApproval: {
      create: vi.fn(),
      update: vi.fn(),
    },
    setting: {
      findFirst: vi.fn(),
    },
    expenseItem: {
      update: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock the auth functions
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))

// Mock the RBAC function
vi.mock('@/lib/rbac', () => ({
  canViewAllExpenses: vi.fn(),
  canApproveExpenses: vi.fn(),
  canApproveAtStage: vi.fn(),
}))

// Mock the error handler
vi.mock('@/lib/error-handler', () => ({
  handleApiError: vi.fn(() => NextResponse.json({ error: 'Internal server error' }, { status: 500 })),
}))

// Mock the email functions to prevent Resend initialization
vi.mock('@/lib/email', () => ({
  sendErrorNotification: vi.fn(),
  generateAdminChangeRequestedEmail: vi.fn(() => ({
    to: 'user@example.com',
    subject: 'Changes Requested',
    html: '<p>Changes requested</p>',
    text: 'Changes requested',
  })),
  generateExpenseApprovedEmail: vi.fn(() => ({
    to: 'user@example.com',
    subject: 'Expense Approved',
    html: '<p>Expense approved</p>',
    text: 'Expense approved',
  })),
  sendEmail: vi.fn(() => Promise.resolve()),
  sendEmailsWithRateLimit: vi.fn(() => Promise.resolve({ sent: 1, failed: 0, errors: [] })),
}))

const { requireAuth } = await import('@/lib/auth')
const { canViewAllExpenses, canApproveExpenses, canApproveAtStage } = await import('@/lib/rbac')

describe('/api/expenses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/expenses', () => {
    it('should return expenses for authenticated user with view all permissions', async () => {
      // Mock authenticated user with view all permissions
      const mockUser = {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN' as const,
        status: 'ACTIVE' as const,
        campus: 'MAIN' as const,
      }

      const mockCreatedAt = new Date()
      const mockExpenses = [
        {
          id: 'expense-1',
          title: 'Office Supplies',
          description: 'Pens and paper',
          status: 'PENDING',
          requesterId: 'user-1',
          createdAt: mockCreatedAt,
          requester: { id: 'user-1', name: 'Admin User', email: 'admin@example.com' },
          attachments: [],
          pastorRemarks: [],
          items: [],
          reports: [],
          expenseNotes: [],
        },
      ]

      const mockCount = 1

      ;(requireAuth as any).mockResolvedValue(mockUser)
      ;(canViewAllExpenses as any).mockReturnValue(true)
      ;(db.expenseRequest.findMany as any).mockResolvedValue(mockExpenses)
      ;(db.expenseRequest.count as any).mockResolvedValue(mockCount)

      const request = new NextRequest('http://localhost:3000/api/expenses')
      const response = await GET(request)
      const data = await response.json()

      expect(requireAuth).toHaveBeenCalled()
      expect(canViewAllExpenses).toHaveBeenCalledWith(mockUser)
      expect(db.expenseRequest.findMany).toHaveBeenCalledWith({
        where: {
          status: { not: 'CLOSED' },
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      })
      expect(db.expenseRequest.count).toHaveBeenCalledWith({
        where: {
          status: { not: 'CLOSED' },
        },
      })
      expect(response.status).toBe(200)
      expect(data).toEqual({
        expenses: [{
          ...mockExpenses[0],
          createdAt: mockCreatedAt.toISOString(),
        }],
        pagination: {
          page: 1,
          limit: 20,
          total: mockCount,
          pages: 1,
        },
      })
    })

    it('should filter expenses by status when status parameter is provided', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Regular User',
        role: 'LEADER' as const,
        status: 'ACTIVE' as const,
        campus: 'MAIN' as const,
      }

      const mockExpenses: any[] = []
      const mockCount = 0

      ;(requireAuth as any).mockResolvedValue(mockUser)
      ;(canViewAllExpenses as any).mockReturnValue(false)
      ;(db.expenseRequest.findMany as any).mockResolvedValue(mockExpenses)
      ;(db.expenseRequest.count as any).mockResolvedValue(mockCount)

      const request = new NextRequest('http://localhost:3000/api/expenses?status=PENDING')
      const response = await GET(request)

      expect(db.expenseRequest.findMany).toHaveBeenCalledWith({
        where: { requesterId: 'user-1', status: 'PENDING' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      })
      expect(response.status).toBe(200)
    })

    it('should filter expenses by search term', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Regular User',
        role: 'LEADER' as const,
        status: 'ACTIVE' as const,
        campus: 'MAIN' as const,
      }

      const mockExpenses: any[] = []
      const mockCount = 0

      ;(requireAuth as any).mockResolvedValue(mockUser)
      ;(canViewAllExpenses as any).mockReturnValue(false)
      ;(db.expenseRequest.findMany as any).mockResolvedValue(mockExpenses)
      ;(db.expenseRequest.count as any).mockResolvedValue(mockCount)

      const request = new NextRequest('http://localhost:3000/api/expenses?search=office')
      const response = await GET(request)

      expect(db.expenseRequest.findMany).toHaveBeenCalledWith({
        where: {
          requesterId: 'user-1',
          status: { not: 'CLOSED' },
          OR: [
            { title: { contains: 'office', mode: 'insensitive' } },
            { description: { contains: 'office', mode: 'insensitive' } },
            { team: { contains: 'office', mode: 'insensitive' } },
            {
              requester: {
                OR: [
                  { name: { contains: 'office', mode: 'insensitive' } },
                  { email: { contains: 'office', mode: 'insensitive' } },
                ],
              },
            },
          ],
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      })
      expect(response.status).toBe(200)
    })

    it('should filter expenses by amount when search is numeric', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Regular User',
        role: 'LEADER' as const,
        status: 'ACTIVE' as const,
        campus: 'MAIN' as const,
      }

      const mockExpenses: any[] = []
      const mockCount = 0

      ;(requireAuth as any).mockResolvedValue(mockUser)
      ;(canViewAllExpenses as any).mockReturnValue(false)
      ;(db.expenseRequest.findMany as any).mockResolvedValue(mockExpenses)
      ;(db.expenseRequest.count as any).mockResolvedValue(mockCount)

      const request = new NextRequest('http://localhost:3000/api/expenses?search=$1,234.56')
      const response = await GET(request)

      expect(db.expenseRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            requesterId: 'user-1',
            status: { not: 'CLOSED' },
            OR: [
              { amountCents: 123456 },
              { title: { contains: '$1,234.56', mode: 'insensitive' } },
              { description: { contains: '$1,234.56', mode: 'insensitive' } },
              { team: { contains: '$1,234.56', mode: 'insensitive' } },
              {
                requester: {
                  OR: [
                    { name: { contains: '$1,234.56', mode: 'insensitive' } },
                    { email: { contains: '$1,234.56', mode: 'insensitive' } },
                  ],
                },
              },
            ],
          },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 20,
        })
      )
      expect(response.status).toBe(200)
    })

    it('should handle pagination correctly', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Regular User',
        role: 'LEADER' as const,
        status: 'ACTIVE' as const,
        campus: 'MAIN' as const,
      }

      const mockExpenses: any[] = []
      const mockCount = 100

      ;(requireAuth as any).mockResolvedValue(mockUser)
      ;(canViewAllExpenses as any).mockReturnValue(false)
      ;(db.expenseRequest.findMany as any).mockResolvedValue(mockExpenses)
      ;(db.expenseRequest.count as any).mockResolvedValue(mockCount)

      const request = new NextRequest('http://localhost:3000/api/expenses?page=3&limit=10')
      const response = await GET(request)
      const data = await response.json()

      expect(db.expenseRequest.findMany).toHaveBeenCalledWith({
        where: {
          requesterId: 'user-1',
          status: { not: 'CLOSED' },
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 20, // (page-1) * limit = (3-1) * 10 = 20
        take: 10,
      })
      expect(data.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 100,
        pages: 10, // Math.ceil(100/10) = 10
      })
      expect(response.status).toBe(200)
    })

    it('should return 500 on database error', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Regular User',
        role: 'LEADER' as const,
        status: 'ACTIVE' as const,
        campus: 'MAIN' as const,
      }

      ;(requireAuth as any).mockResolvedValue(mockUser)
      ;(canViewAllExpenses as any).mockReturnValue(false)
      ;(db.expenseRequest.findMany as any).mockRejectedValue(new Error('Internal server error'))

      const request = new NextRequest('http://localhost:3000/api/expenses')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/expenses/admin-change-request', () => {
    it('should allow admin to request changes on submitted expense', async () => {
      // Mock admin user
      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN' as const,
        status: 'ACTIVE' as const,
        campus: 'DMV' as const,
      }

      // Mock expense data
      const mockExpense = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Expense',
        status: 'SUBMITTED',
        requester: {
          name: 'Test User',
          email: 'user@example.com',
        },
        items: [],
      }

      // Mock requireAuth to return admin user
      vi.mocked(requireAuth).mockResolvedValue(mockUser)

      // Mock db calls
      vi.mocked(db.expenseRequest.findUnique).mockResolvedValue(mockExpense as any)
      vi.mocked(db.expenseRequest.update).mockResolvedValue({
        ...mockExpense,
        status: 'CHANGE_REQUESTED',
        notes: 'Please update the budget',
      } as any)
      vi.mocked(db.statusEvent.create).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/expenses/admin-change-request', {
        method: 'POST',
        body: JSON.stringify({
          expenseId: '123e4567-e89b-12d3-a456-426614174000',
          comment: 'Please update the budget',
        }),
      })

      const response = await adminChangeRequestPost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('Change request submitted successfully')
      expect(data.expense.status).toBe('CHANGE_REQUESTED')
    })

    it('should reject non-admin users', async () => {
      // Mock regular user
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Regular User',
        role: 'LEADER' as const,
        status: 'ACTIVE' as const,
        campus: 'DMV' as const,
      }

      vi.mocked(requireAuth).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/expenses/admin-change-request', {
        method: 'POST',
        body: JSON.stringify({
          expenseId: 'expense-1',
          comment: 'Please update the budget',
        }),
      })

      const response = await adminChangeRequestPost(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only admins can request changes to expenses')
    })

    it('should allow admin to request changes on approved expense', async () => {
      // Mock admin user
      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN' as const,
        status: 'ACTIVE' as const,
        campus: 'DMV' as const,
      }

      // Mock approved expense data
      const mockExpense = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Approved Expense',
        status: 'APPROVED',
        requester: {
          name: 'Test User',
          email: 'user@example.com',
        },
        items: [],
      }

      // Mock requireAuth to return admin user
      vi.mocked(requireAuth).mockResolvedValue(mockUser)

      // Mock db calls
      vi.mocked(db.expenseRequest.findUnique).mockResolvedValue(mockExpense as any)
      vi.mocked(db.expenseRequest.update).mockResolvedValue({
        ...mockExpense,
        status: 'CHANGE_REQUESTED',
        notes: 'Need to adjust budget',
      } as any)
      vi.mocked(db.statusEvent.create).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/expenses/admin-change-request', {
        method: 'POST',
        body: JSON.stringify({
          expenseId: '123e4567-e89b-12d3-a456-426614174000',
          comment: 'Need to adjust budget',
        }),
      })

      const response = await adminChangeRequestPost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('Change request submitted successfully')
      expect(data.expense.status).toBe('CHANGE_REQUESTED')
    })

    it('should reject admin change request on invalid status', async () => {
      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN' as const,
        status: 'ACTIVE' as const,
        campus: 'DMV' as const,
      }

      const mockExpense = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Paid Expense',
        status: 'PAID', // Invalid status for change requests
        requester: {
          name: 'Test User',
          email: 'user@example.com',
        },
        items: [],
      }

      vi.mocked(requireAuth).mockResolvedValue(mockUser)
      vi.mocked(db.expenseRequest.findUnique).mockResolvedValue(mockExpense as any)

      const request = new NextRequest('http://localhost:3000/api/expenses/admin-change-request', {
        method: 'POST',
        body: JSON.stringify({
          expenseId: '123e4567-e89b-12d3-a456-426614174000',
          comment: 'Invalid request',
        }),
      })

      const response = await adminChangeRequestPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Can only request changes to submitted or approved expenses')
    })
  })

  describe('POST /api/expenses/request-change', () => {
    it('should allow requester to request changes on submitted expense', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'LEADER' as const,
        status: 'ACTIVE' as const,
        campus: 'DMV' as const,
      }

      const mockExpense = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Submitted Expense',
        status: 'SUBMITTED',
        requesterId: 'user-1', // Same as mock user
        requester: {
          name: 'Test User',
          email: 'user@example.com',
        },
        items: [],
      }

      vi.mocked(requireAuth).mockResolvedValue(mockUser)
      vi.mocked(db.expenseRequest.findUnique).mockResolvedValue(mockExpense as any)
      vi.mocked(db.expenseRequest.update).mockResolvedValue({
        ...mockExpense,
        status: 'CHANGE_REQUESTED',
      } as any)
      vi.mocked(db.statusEvent.create).mockResolvedValue({} as any)
      vi.mocked(db.user.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/expenses/request-change', {
        method: 'POST',
        body: JSON.stringify({
          expenseId: '123e4567-e89b-12d3-a456-426614174000',
          comment: 'I need to make changes',
        }),
      })

      const response = await requestChangePost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('You can now edit this expense')
      expect(data.expense.status).toBe('CHANGE_REQUESTED')
    })

    it('should allow requester to request changes on approved expense', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'LEADER' as const,
        status: 'ACTIVE' as const,
        campus: 'DMV' as const,
      }

      const mockExpense = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Approved Expense',
        status: 'APPROVED',
        requesterId: 'user-1',
        requester: {
          name: 'Test User',
          email: 'user@example.com',
        },
        items: [],
      }

      vi.mocked(requireAuth).mockResolvedValue(mockUser)
      vi.mocked(db.expenseRequest.findUnique).mockResolvedValue(mockExpense as any)
      vi.mocked(db.expenseRequest.update).mockResolvedValue({
        ...mockExpense,
        status: 'CHANGE_REQUESTED',
      } as any)
      vi.mocked(db.statusEvent.create).mockResolvedValue({} as any)
      vi.mocked(db.user.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/expenses/request-change', {
        method: 'POST',
        body: JSON.stringify({
          expenseId: '123e4567-e89b-12d3-a456-426614174000',
          comment: 'I want to add more items',
        }),
      })

      const response = await requestChangePost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('You can now add more items to this expense')
      expect(data.expense.status).toBe('CHANGE_REQUESTED')
    })

    it('should allow admin to request changes on submitted expense', async () => {
      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN' as const,
        status: 'ACTIVE' as const,
        campus: 'DMV' as const,
      }

      const mockExpense = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Submitted Expense',
        status: 'SUBMITTED',
        requesterId: 'user-1', // Different from admin
        requester: {
          name: 'Test User',
          email: 'user@example.com',
        },
        items: [],
      }

      vi.mocked(requireAuth).mockResolvedValue(mockUser)
      vi.mocked(db.expenseRequest.findUnique).mockResolvedValue(mockExpense as any)
      vi.mocked(db.expenseRequest.update).mockResolvedValue({
        ...mockExpense,
        status: 'CHANGE_REQUESTED',
      } as any)
      vi.mocked(db.statusEvent.create).mockResolvedValue({} as any)
      vi.mocked(db.user.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/expenses/request-change', {
        method: 'POST',
        body: JSON.stringify({
          expenseId: '123e4567-e89b-12d3-a456-426614174000',
          comment: 'Admin requested changes',
        }),
      })

      const response = await requestChangePost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('The requester can now edit the expense')
      expect(data.expense.status).toBe('CHANGE_REQUESTED')
    })

    it('should reject unauthorized user requesting changes', async () => {
      const mockUser = {
        id: 'user-2',
        email: 'other@example.com',
        name: 'Other User',
        role: 'LEADER' as const,
        status: 'ACTIVE' as const,
        campus: 'DMV' as const,
      }

      const mockExpense = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Submitted Expense',
        status: 'SUBMITTED',
        requesterId: 'user-1', // Different from mock user
        requester: {
          name: 'Test User',
          email: 'user@example.com',
        },
        items: [],
      }

      vi.mocked(requireAuth).mockResolvedValue(mockUser)
      vi.mocked(db.expenseRequest.findUnique).mockResolvedValue(mockExpense as any)

      const request = new NextRequest('http://localhost:3000/api/expenses/request-change', {
        method: 'POST',
        body: JSON.stringify({
          expenseId: '123e4567-e89b-12d3-a456-426614174000',
          comment: 'Unauthorized request',
        }),
      })

      const response = await requestChangePost(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('You can only request changes to your own expense requests or be an admin')
    })

    it('should reject change request on invalid status', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'LEADER' as const,
        status: 'ACTIVE' as const,
        campus: 'DMV' as const,
      }

      const mockExpense = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Denied Expense',
        status: 'DENIED', // Invalid status
        requesterId: 'user-1',
        requester: {
          name: 'Test User',
          email: 'user@example.com',
        },
        items: [],
      }

      vi.mocked(requireAuth).mockResolvedValue(mockUser)
      vi.mocked(db.expenseRequest.findUnique).mockResolvedValue(mockExpense as any)

      const request = new NextRequest('http://localhost:3000/api/expenses/request-change', {
        method: 'POST',
        body: JSON.stringify({
          expenseId: '123e4567-e89b-12d3-a456-426614174000',
          comment: 'Invalid request',
        }),
      })

      const response = await requestChangePost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Change requests can only be made for submitted or approved expenses')
    })

    it('should handle non-existent expense', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'LEADER' as const,
        status: 'ACTIVE' as const,
        campus: 'DMV' as const,
      }

      vi.mocked(requireAuth).mockResolvedValue(mockUser)
      vi.mocked(db.expenseRequest.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/expenses/request-change', {
        method: 'POST',
        body: JSON.stringify({
          expenseId: '123e4567-e89b-12d3-a456-426614174000',
          comment: 'Non-existent expense',
        }),
      })

      const response = await requestChangePost(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Expense request not found')
    })

    it('should require comment', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'LEADER' as const,
        status: 'ACTIVE' as const,
        campus: 'DMV' as const,
      }

      const mockExpense = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Submitted Expense',
        status: 'SUBMITTED',
        requesterId: 'user-1',
        requester: {
          name: 'Test User',
          email: 'user@example.com',
        },
        items: [],
      }

      vi.mocked(requireAuth).mockResolvedValue(mockUser)
      vi.mocked(db.expenseRequest.findUnique).mockResolvedValue(mockExpense as any)

      const request = new NextRequest('http://localhost:3000/api/expenses/request-change', {
        method: 'POST',
        body: JSON.stringify({
          expenseId: '123e4567-e89b-12d3-a456-426614174000',
          comment: '', // Empty comment
        }),
      })

      const response = await requestChangePost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })
  })

  describe('POST /api/expenses/approve', () => {
    it('should skip denied items when auto-approving expense', async () => {
      // Mock authenticated admin user
      const mockUser = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN' as const,
        status: 'ACTIVE' as const,
        campus: 'MAIN' as const,
      }

      // Mock expense with one approved item and one denied item
      const mockExpense = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Expense',
        amountCents: 20000, // $200
        status: 'SUBMITTED',
        requesterId: '550e8400-e29b-41d4-a716-446655440001',
        requester: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Test User',
          email: 'user@example.com',
          status: 'ACTIVE' as const,
        },
        approvals: [],
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            amountCents: 10000, // $100
            description: 'Item 1',
            approvals: [], // No existing approval from current user
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440005',
            amountCents: 10000, // $100
            description: 'Item 2',
            approvals: [
              {
                id: '550e8400-e29b-41d4-a716-446655440006',
                status: 'DENIED',
                approverId: '550e8400-e29b-41d4-a716-446655440004', // Same user denied it
              },
            ],
          },
        ],
      }

      const mockSettings = { requireTwoStage: false }

      // Mock all the required functions
      ;(requireAuth as any).mockResolvedValue(mockUser)
      ;(canApproveExpenses as any).mockReturnValue(true)
      ;(canApproveAtStage as any).mockReturnValue(true)
      ;(db.expenseRequest.findUnique as any).mockResolvedValueOnce(mockExpense)
      ;(db.approval.findUnique as any).mockResolvedValue(null)
      ;(db.approval.upsert as any).mockResolvedValue({})
      ;(db.setting.findFirst as any).mockResolvedValue(mockSettings)
      ;(db.expenseItemApproval.create as any).mockResolvedValue({})
      ;(db.expenseRequest.update as any).mockResolvedValue({})
      ;(db.statusEvent.create as any).mockResolvedValue({})
      ;(db.expenseRequest.findUnique as any).mockResolvedValueOnce({
        ...mockExpense,
        items: [
          {
            ...mockExpense.items[0],
            approvals: [{ status: 'APPROVED', approvedAmountCents: 10000 }],
          },
          {
            ...mockExpense.items[1],
            approvals: [{ status: 'DENIED' }], // Denied item should remain denied
          },
        ],
      })
      ;(db.user.findMany as any).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/expenses/approve', {
        method: 'POST',
        body: JSON.stringify({
          expenseId: '550e8400-e29b-41d4-a716-446655440000',
          stage: 1,
          comment: 'Approved with some items denied',
        }),
      })

      const response = await approvePost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Expense request approved successfully')
      expect(data.status).toBe('APPROVED')

      // Verify that expenseItemApproval.create was called only once (for the non-denied item)
      expect(db.expenseItemApproval.create).toHaveBeenCalledTimes(1)
      expect(db.expenseItemApproval.create).toHaveBeenCalledWith({
        data: {
          itemId: '550e8400-e29b-41d4-a716-446655440002', // Only the non-denied item should be auto-approved
          approverId: '550e8400-e29b-41d4-a716-446655440004',
          status: 'APPROVED',
          approvedAmountCents: 10000,
          comment: 'Auto-approved with expense approval: Approved with some items denied',
        },
      })

      // Verify that the denied item was not auto-approved
      expect(db.expenseItemApproval.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            itemId: '550e8400-e29b-41d4-a716-446655440005',
          }),
        })
      )
    })
  })

  describe('PUT /api/expenses/update', () => {
    it('should map attachment temp itemIds to newly created items when adding items in change request', async () => {
      const expenseId = '550e8400-e29b-41d4-a716-446655440100'
      const existingItemId = '550e8400-e29b-41d4-a716-446655440101'
      const newItemId = '550e8400-e29b-41d4-a716-446655440102'

      const mockUser = {
        id: '550e8400-e29b-41d4-a716-446655440200',
        email: 'requester@example.com',
        name: 'Requester',
        role: 'ADMIN' as const,
        status: 'ACTIVE' as const,
        campus: 'DMV' as const,
      }

      const existingExpense = {
        id: expenseId,
        title: 'Existing Expense',
        amountCents: 1000,
        team: 'ADMINISTRATION',
        campus: 'DMV',
        description: 'desc',
        notes: null,
        category: 'Hospitality',
        urgency: 2,
        eventDate: null,
        eventName: null,
        fullEventBudgetCents: null,
        payToExternal: false,
        payeeName: null,
        payeeZelle: null,
        status: 'CHANGE_REQUESTED',
        requester: { email: mockUser.email },
        items: [
          {
            id: existingItemId,
            description: 'Existing item',
            category: null,
            quantity: 1,
            unitPriceCents: 1000,
            amountCents: 1000,
          },
        ],
      }

      const payload = {
        expenseId,
        title: 'Existing Expense',
        amountCents: 55500,
        team: 'ADMINISTRATION',
        campus: 'DMV',
        description: 'desc',
        notes: null,
        category: 'Hospitality',
        urgency: 2,
        eventDate: null,
        eventName: null,
        fullEventBudgetCents: null,
        payToExternal: false,
        payeeName: null,
        payeeZelle: null,
        items: [
          {
            id: existingItemId,
            tempId: null,
            description: 'Existing item',
            category: null,
            quantity: 1,
            unitPriceCents: 1000,
            amountCents: 1000,
          },
          {
            tempId: 'temp-1',
            description: 'New item',
            category: null,
            quantity: 1,
            unitPriceCents: 54522,
            amountCents: 54522,
          },
        ],
        attachments: [
          {
            publicId: 'public-id-1',
            secureUrl: 'https://example.com/attachment1',
            mimeType: 'image/png',
            itemId: 'temp-1',
          },
        ],
      }

      ;(requireAuth as any).mockResolvedValue(mockUser)
      ;(db.expenseRequest.findUnique as any).mockResolvedValue(existingExpense)
      ;(db.statusEvent.findFirst as any).mockResolvedValue({ id: 'status-1' }) // mark as previously approved
      ;(db.expenseItem.create as any).mockResolvedValue({ id: newItemId })
      ;(db.expenseRequest.update as any).mockResolvedValue({ ...existingExpense, status: 'SUBMITTED' })
      ;(db.statusEvent.create as any).mockResolvedValue({})
      ;(db.user.findMany as any).mockResolvedValue([])
      ;(db.approval.findUnique as any).mockResolvedValue(null)
      ;(db.approval.upsert as any).mockResolvedValue({})

      const request = new NextRequest('http://localhost:3000/api/expenses/update', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })

      const response = await updateExpensePut(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Expense request updated successfully')

      // New item created and mapped
      expect(db.expenseItem.create).toHaveBeenCalledTimes(1)

      // Attachments should reference the newly created itemId (resolved from tempId)
      expect(db.expenseRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attachments: expect.objectContaining({
              deleteMany: {},
              create: expect.arrayContaining([
                expect.objectContaining({
                  publicId: 'public-id-1',
                  itemId: newItemId,
                }),
              ]),
            }),
          }),
        })
      )
    })
  })
})
