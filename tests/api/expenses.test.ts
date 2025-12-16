import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET } from '@/app/api/expenses/route'
import { db } from '@/lib/db'

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    expenseRequest: {
      findMany: vi.fn(),
      count: vi.fn(),
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
})
