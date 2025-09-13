import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canExportData } from '@/lib/rbac'
import { streamCSV, getCSVFilename, ExpenseWithDetails } from '@/lib/csv'

export async function GET(request: NextRequest) {
  try {
    // Require authentication and export permissions
    const user = await requireAuth()

    if (!canExportData(user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to export data' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    const where: any = {}
    
    if (teamId) {
      where.teamId = teamId
    }
    
    if (status) {
      where.status = status
    }
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    // Get expenses with related data
    const expenses = await db.expenseRequest.findMany({
      where,
      include: {
        requester: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }) as ExpenseWithDetails[]

    // Create streaming response
    const filename = getCSVFilename('expenses')
    
    const response = new Response(
      new ReadableStream({
        start(controller) {
          try {
            streamCSV(expenses, (chunk) => {
              controller.enqueue(new TextEncoder().encode(chunk))
            })
            controller.close()
          } catch (error) {
            controller.error(error)
          }
        },
      }),
      {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      }
    )

    return response
  } catch (error) {
    console.error('Export CSV error:', error)
    return NextResponse.json(
      { error: 'Failed to export CSV' },
      { status: 500 }
    )
  }
}
