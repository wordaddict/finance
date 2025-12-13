import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Only admins can access reports
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    
    const expenseId = searchParams.get('expenseId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Admins can see all reports
    const baseWhere = {}

    // Build where clause
    const where: any = { ...baseWhere }
    
    if (expenseId) {
      where.expenseId = expenseId
    }

    if (status) {
      where.status = status
    }

    if (search) {
      const searchConditions: any[] = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
      
      // If searching in expense title, we need to handle it differently
      // since it's a relation, we'll search in the expense relation
      if (!expenseId) {
        // Only add expense title search if we're not already filtering by expenseId
        searchConditions.push({
          expense: {
            title: { contains: search, mode: 'insensitive' }
          }
        })
      }
      
      where.OR = searchConditions
    }

    // Get reports with pagination
    const [reports, total] = await Promise.all([
      db.expenseReport.findMany({
        where,
        include: {
          expense: {
            include: {
              requester: true,
            },
          },
          attachments: true,
          approvedItems: true,
          reportNotes: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        } as any,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.expenseReport.count({ where }),
    ])

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Fetch reports error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}
