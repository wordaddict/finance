import { describe, it, expect } from "vitest"
import { generateCSV, streamCSV, getCSVFilename, type ExpenseWithDetails } from "./csv"

function buildSampleExpense(overrides: Partial<ExpenseWithDetails> = {}): ExpenseWithDetails {
  const base: ExpenseWithDetails = {
    id: "exp_1",
    title: "Test Expense",
    amountCents: 12345,
    team: "ADMIN",
    requesterId: "user_1",
    description: "Some description",
    category: "Administrative Expenses",
    urgency: 2,
    notes: "Note",
    status: "SUBMITTED",
    paidAt: null,
    paymentDate: null,
    paidAmountCents: null,
    paidBy: null,
    eventDate: null,
    eventName: null,
    fullEventBudgetCents: null,
    reportRequired: false,
    account: "CCI_DMV_CHECKINGS",
    expenseType: "Direct Payment",
    createdAt: new Date("2023-01-01T00:00:00.000Z"),
    updatedAt: new Date("2023-01-02T00:00:00.000Z"),
    campus: "DMV",
    requester: {
      id: "user_1",
      name: "John Doe",
      email: "john@example.com",
      zelle: "john-zelle",
    },
    items: [
      {
        id: "item_1",
        description: "Item 1",
        category: "Administrative Expenses",
        quantity: 2,
        unitPriceCents: 5000,
        amountCents: 10000,
        approvals: [
          {
            id: "appr_1",
            status: "APPROVED",
            approvedAmountCents: 10000,
            comment: "Looks good",
            approver: {
              name: "Approver",
              email: "approver@example.com",
            },
            createdAt: new Date("2023-01-03T00:00:00.000Z"),
          },
        ],
      },
    ],
    approvals: [
      {
        id: "appr_2",
        stage: 1,
        decision: "APPROVED",
        comment: "OK",
        decidedAt: new Date("2023-01-04T00:00:00.000Z"),
        approver: {
          name: "Pastor",
          email: "pastor@example.com",
        },
      },
    ],
    pastorRemarks: [
      {
        id: "remark_1",
        remark: "Well done",
        pastor: {
          name: "Pastor",
          email: "pastor@example.com",
        },
        createdAt: new Date("2023-01-05T00:00:00.000Z"),
      },
    ],
    reports: [
      {
        id: "rep_1",
        totalApprovedAmount: 10000,
        createdAt: new Date("2023-01-06T00:00:00.000Z"),
        notes: [
          {
            id: "note_1",
            note: "Report note",
            author: {
              name: "Reporter",
              email: "reporter@example.com",
            },
            createdAt: new Date("2023-01-07T00:00:00.000Z"),
          },
        ],
      },
    ],
    attachments: [
      {
        id: "att_1",
        publicId: "public",
        secureUrl: "https://example.com/att1",
        mimeType: "image/png",
        itemId: "item_1",
      },
    ],
  }

  return { ...base, ...overrides }
}

describe("csv utilities", () => {
  it("generateCSV produces header plus one data row", () => {
    const expense = buildSampleExpense()
    const csv = generateCSV([expense])

    const lines = csv.split("\n")
    expect(lines.length).toBe(2)
    expect(lines[0]).toContain("ID,Title,Amount ($),Team")
    expect(lines[1]).toContain("Test Expense")
    expect(lines[1]).toContain("123.45")
  })

  it("streamCSV writes identical content to generateCSV", () => {
    const expense = buildSampleExpense()

    const chunks: string[] = []
    streamCSV([expense], (chunk) => {
      chunks.push(chunk)
    })
    const streamed = chunks.join("")

    const generated = generateCSV([expense]) + "\n"

    expect(streamed).toBe(generated)
  })

  it("getCSVFilename builds filename with filters when provided", () => {
    const name = getCSVFilename("expenses", {
      team: "ADMIN",
      campus: "DMV",
      status: "SUBMITTED",
      startDate: "2023-01-01",
      endDate: "2023-01-31",
    })

    expect(name).toMatch(/^expenses_\d{4}-\d{2}-\d{2}_team-ADMIN_campus-DMV_status-SUBMITTED_from-2023-01-01_to-2023-01-31\.csv$/)
  })
})


