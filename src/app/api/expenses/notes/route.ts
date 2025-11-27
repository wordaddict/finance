import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { canViewAllExpenses } from '@/lib/rbac'

const addNoteSchema = z.object({
  expenseId: z.string().uuid(),
  note: z.string().min(1, 'Note cannot be empty'),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { expenseId, note } = addNoteSchema.parse(body)

    // Get the expense to verify it exists and user has access
    const expense = await db.expenseRequest.findUnique({
      where: { id: expenseId },
      include: {
        requester: true,
      },
    })

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense request not found' },
        { status: 404 }
      )
    }

    // Check if user can add notes to this expense
    // User must be: the requester, an admin, or a campus pastor for the expense's campus
    const canAddNote = 
      expense.requesterId === user.id || 
      user.role === 'ADMIN' || 
      (user.role === 'CAMPUS_PASTOR' && expense.campus === user.campus)

    if (!canAddNote) {
      return NextResponse.json(
        { error: 'You do not have permission to add notes to this expense' },
        { status: 403 }
      )
    }

    // Create the note
    const expenseNote = await db.expenseNote.create({
      data: {
        expenseId,
        authorId: user.id,
        note: note.trim(),
      },
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
    })

    return NextResponse.json({
      message: 'Note added successfully',
      note: expenseNote,
    })
  } catch (error) {
    console.error('Add note error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to add note' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const expenseId = searchParams.get('expenseId')

    if (!expenseId) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
        { status: 400 }
      )
    }

    // Get the expense to verify it exists and user has access
    const expense = await db.expenseRequest.findUnique({
      where: { id: expenseId },
      include: {
        requester: true,
      },
    })

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense request not found' },
        { status: 404 }
      )
    }

    // Check if user can view notes for this expense
    const canViewNotes = 
      expense.requesterId === user.id || 
      canViewAllExpenses(user) ||
      (user.role === 'CAMPUS_PASTOR' && expense.campus === user.campus)

    if (!canViewNotes) {
      return NextResponse.json(
        { error: 'You do not have permission to view notes for this expense' },
        { status: 403 }
      )
    }

    // Get all notes for this expense
    const notes = await db.expenseNote.findMany({
      where: { expenseId },
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
    })

    return NextResponse.json({ notes })
  } catch (error) {
    console.error('Get notes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

