import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({
    id: "user_1",
    email: "john@example.com",
    name: "John Doe",
    role: "ADMIN",
    status: "ACTIVE",
    campus: "DMV",
  })),
}))

// Use a factory function so hoisted mock does not reference uninitialized variables
vi.mock("@/lib/db", () => {
  return {
    db: {
      expenseRequest: {
        create: vi.fn(),
      },
      expenseItem: {
        create: vi.fn(),
      },
      attachment: {
        createMany: vi.fn(),
      },
      statusEvent: {
        create: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
      },
    },
  }
})

vi.mock("@/lib/email", () => ({
  generateExpenseSubmittedEmail: vi.fn(() => ({
    to: "",
    subject: "New expense",
    html: "<p>New expense</p>",
  })),
  sendEmailsWithRateLimit: vi.fn(async (templates: any[]) => ({
    failed: 0,
    errors: [],
    sent: templates.length,
  })),
}))

vi.mock("@/lib/sms", () => ({
  sendSMS: vi.fn(),
  generateExpenseSubmittedSMS: vi.fn(),
}))

const { db } = await import("@/lib/db")

describe("POST /api/expenses/create", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
  })

  it("creates an expense and returns 200 with created data", async () => {
    const fakeExpense = {
      id: "exp_1",
      title: "Test",
      amountCents: 1000,
      requester: { name: "John Doe", email: "john@example.com" },
    }

    db.expenseRequest.create.mockResolvedValue(fakeExpense as any)
    db.expenseItem.create.mockResolvedValueOnce({ id: "item_1" } as any)
    db.attachment.createMany.mockResolvedValue(undefined as any)
    db.statusEvent.create.mockResolvedValue(undefined as any)
    db.user.findMany.mockResolvedValue([
      { id: "approver_1", email: "approver@example.com", name: "Approver", status: "ACTIVE" },
    ] as any)

    const body = {
      title: "Test",
      amountCents: 1000,
      team: "ADMIN",
      campus: "DMV",
      description: "Some description",
      category: "Administrative Expenses",
      urgency: 2,
      eventDate: null,
      eventName: null,
      fullEventBudgetCents: null,
      attachments: [
        {
          publicId: "att1",
          secureUrl: "https://example.com/att1",
          mimeType: "image/png",
          itemId: "1",
        },
      ],
      items: [
        {
          description: "Item 1",
          category: "Administrative Expenses",
          quantity: 1,
          unitPriceCents: 1000,
          amountCents: 1000,
        },
      ],
    }

    const request = new Request("http://localhost/api/expenses/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })

    const response = await POST(request as any)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.message).toBe("Expense request created successfully")
    expect(json.expense.id).toBe("exp_1")

    expect(db.expenseRequest.create).toHaveBeenCalled()
    expect(db.expenseItem.create).toHaveBeenCalledTimes(1)
    expect(db.attachment.createMany).toHaveBeenCalledTimes(1)
    expect(db.statusEvent.create).toHaveBeenCalledTimes(1)
    expect(db.user.findMany).toHaveBeenCalledTimes(1)
  })

  it("returns 500 when validation fails", async () => {
    const invalidBody = {
      // missing title and other required fields
      amountCents: -100,
      team: "ADMIN",
      campus: "DMV",
      description: "",
      category: "Administrative Expenses",
      urgency: 2,
      items: [],
    }

    const request = new Request("http://localhost/api/expenses/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(invalidBody),
    })

    const response = await POST(request as any)

    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toBe("Failed to create expense request")
  })
})


