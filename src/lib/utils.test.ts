import { describe, it, expect } from "vitest"
import { cn, formatCurrency, formatDate, formatDateTime } from "./utils"

describe("utils", () => {
  describe("cn", () => {
    it("merges class names and filters falsy values", () => {
      const result = cn(
        "base",
        false && "hidden",
        undefined,
        null as unknown as string,
        "text-sm",
        ["font-bold", false && "opacity-0"]
      )

      expect(result).toContain("base")
      expect(result).toContain("text-sm")
      expect(result).toContain("font-bold")
      expect(result).not.toContain("hidden")
      expect(result).not.toContain("opacity-0")
    })

    it("deduplicates conflicting Tailwind classes with later ones winning", () => {
      const result = cn("p-2", "p-4", "p-2 md:p-6")

      // twMerge keeps the last conflicting class; here "p-2 md:p-6"
      expect(result.includes("p-4")).toBe(false)
      expect(result.includes("p-2")).toBe(true)
      expect(result.includes("md:p-6")).toBe(true)
    })
  })

  describe("formatCurrency", () => {
    it("formats positive amounts in USD with cents", () => {
      const formatted = formatCurrency(12345) // 123.45
      expect(formatted).toMatch(/^\$\d{1,3}(,\d{3})*\.\d{2}$/)
      expect(formatted).toContain("123.45")
    })

    it("formats zero correctly", () => {
      const formatted = formatCurrency(0)
      expect(formatted).toBe("$0.00")
    })

    it("formats negative amounts correctly", () => {
      const formatted = formatCurrency(-2500) // -25.00
      // Depending on locale, negative may be "-$25.00" or "($25.00)"
      expect(formatted).toMatch(/-\$\d+\.00|\(\$\d+\.00\)/)
    })
  })

  describe("formatDate", () => {
    it("formats Date objects in `MMM D, YYYY` style", () => {
      const date = new Date("2023-12-25T00:00:00Z")
      const formatted = formatDate(date)

      expect(formatted).toMatch(/Dec \d{1,2}, 2023/)
    })

    it("accepts ISO date strings", () => {
      const formatted = formatDate("2024-01-01T12:34:56Z")

      expect(formatted).toMatch(/Jan \d{1,2}, 2024/)
    })
  })

  describe("formatDateTime", () => {
    it("formats Date objects with date and time", () => {
      const date = new Date("2023-07-04T15:30:00Z")
      const formatted = formatDateTime(date)

      expect(formatted).toMatch(/Jul \d{1,2}, 2023/)
      // Time portion will vary by local timezone, so just assert presence of a colon
      expect(formatted).toMatch(/\d{1,2}:\d{2}/)
    })

    it("accepts string inputs and formats them", () => {
      const formatted = formatDateTime("2023-11-01T08:15:00Z")

      expect(formatted).toMatch(/Nov \d{1,2}, 2023/)
      expect(formatted).toMatch(/\d{1,2}:\d{2}/)
    })
  })
})


