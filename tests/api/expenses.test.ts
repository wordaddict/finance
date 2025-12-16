import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET } from '@/app/api/expenses/route'
import { POST as adminChangeRequestPost } from '@/app/api/expenses/admin-change-request/route'
import { POST as requestChangePost } from '@/app/api/expenses/request-change/route'
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
    statusEvent: {
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
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
  sendEmailsWithRateLimit: vi.fn(() => Promise.resolve({ sent: 1, failed: 0, errors: [] })),
}))

const { requireAuth } = await import('@/lib/auth')
const { canViewAllExpenses } = await import('@/lib/rbac')

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
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      })
      expect(db.expenseRequest.count).toHaveBeenCalledWith({ where: {} })
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
          OR: [
            { title: { contains: 'office', mode: 'insensitive' } },
            { description: { contains: 'office', mode: 'insensitive' } },
          ],
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      })
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
        where: { requesterId: 'user-1' },
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
      expect(data.expense.notes).toBe('Please update the budget')
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
      expect(data.expense.notes).toBe('Need to adjust budget')
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
})
