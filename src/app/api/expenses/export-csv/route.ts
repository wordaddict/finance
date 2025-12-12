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
    const team = searchParams.get('team')
    const campus = searchParams.get('campus')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const urgency = searchParams.get('urgency')
    const account = searchParams.get('account')
    const expenseType = searchParams.get('expenseType')
    const category = searchParams.get('category')

    // Build where clause
    const where: any = {}
    
    if (team) {
      where.team = team
    }
    
    if (campus) {
      where.campus = campus
    }
    
    if (status) {
      where.status = status
    }
    
    if (urgency) {
      where.urgency = parseInt(urgency)
    }
    
    if (account) {
      where.account = account
    }
    
    if (expenseType) {
      where.expenseType = expenseType
    }
    
    if (category) {
      where.category = category
    }
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    // Get expenses with all related data for rich CSV
    const expenses = await db.expenseRequest.findMany({
      where,
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            zelle: true,
          },
        },
        items: {
          include: {
            approvals: {
              include: {
                approver: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        pastorRemarks: {
          include: {
            pastor: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        reports: {
          include: {
            reportNotes: {
              include: {
                author: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        attachments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }) as any as ExpenseWithDetails[]

    // Create streaming response with filter info in filename
    const filename = getCSVFilename('expenses', {
      team: team || undefined,
      campus: campus || undefined,
      status: status || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
    
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
