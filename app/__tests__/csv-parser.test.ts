import { describe, it, expect } from "vitest"
import { parseCSVToMetrics } from "../lib/csv-parser"

describe("parseCSVToMetrics", () => {
  it("parses simple two-column CSV (text + number)", () => {
    const data = [
      { p1: "chatType_chat", "Сумма hits": 44295 },
      { p1: "chatType_user", "Сумма hits": 44077 },
      { p1: "chatType_notes", "Сумма hits": 7126 },
    ]
    const result = parseCSVToMetrics(data)
    expect(result).not.toBeNull()
    expect(result!.periods).toHaveLength(3)
    expect(result!.periods[0].label).toBe("chatType_chat")
    expect(result!.metrics).toHaveLength(1)
    expect(result!.metrics[0].name).toBe("Сумма hits")
    expect(result!.metrics[0].rows[0].values).toEqual([44295, 44077, 7126])
  })

  it("aggregates rows with duplicate labels", () => {
    const data = [
      { Год: 2025, Месяц: "Ноябрь", День: 6, "Сумма hits": 100 },
      { Год: 2025, Месяц: "Ноябрь", День: 7, "Сумма hits": 200 },
      { Год: 2025, Месяц: "Декабрь", День: 1, "Сумма hits": 300 },
    ]
    const result = parseCSVToMetrics(data)
    expect(result).not.toBeNull()
    // Год has 1 unique value → reclassified as text
    // Labels: "2025 · Ноябрь", "2025 · Декабрь"
    expect(result!.periods).toHaveLength(2)
    // "Сумма hits" aggregated: Ноябрь = 300, Декабрь = 300
    const hitsMetric = result!.metrics.find(m => m.name === "Сумма hits")
    expect(hitsMetric).toBeDefined()
    expect(hitsMetric!.rows[0].values).toEqual([300, 300])
  })

  it("handles multiple numeric columns as separate metrics", () => {
    const data = [
      { name: "A", revenue: 100, users: 10 },
      { name: "B", revenue: 200, users: 20 },
    ]
    const result = parseCSVToMetrics(data)
    expect(result).not.toBeNull()
    expect(result!.periods).toHaveLength(2)
    expect(result!.metrics).toHaveLength(2)
    expect(result!.metrics.map(m => m.name).sort()).toEqual(["revenue", "users"])
  })

  it("returns null for empty data", () => {
    expect(parseCSVToMetrics([])).toBeNull()
  })

  it("returns null when no numeric columns found", () => {
    const data = [
      { a: "foo", b: "bar" },
      { a: "baz", b: "qux" },
    ]
    expect(parseCSVToMetrics(data)).toBeNull()
  })

  it("reclassifies numeric column with few unique values as text", () => {
    const data = [
      { year: 2025, month: "Jan", value: 100 },
      { year: 2025, month: "Feb", value: 200 },
      { year: 2026, month: "Jan", value: 300 },
      { year: 2026, month: "Feb", value: 400 },
    ]
    const result = parseCSVToMetrics(data)
    expect(result).not.toBeNull()
    // year has 2 unique values → reclassified as text
    expect(result!.periods).toHaveLength(4)
    expect(result!.metrics).toHaveLength(1)
    expect(result!.metrics[0].name).toBe("value")
  })

  it("generates row labels when no text columns", () => {
    const data = [
      { a: 10, b: 20, c: 30, d: 40, e: 50, f: 60 },
      { a: 70, b: 80, c: 90, d: 100, e: 110, f: 120 },
    ]
    const result = parseCSVToMetrics(data)
    expect(result).not.toBeNull()
    expect(result!.periods[0].label).toBe("1")
    expect(result!.periods[1].label).toBe("2")
  })
})
