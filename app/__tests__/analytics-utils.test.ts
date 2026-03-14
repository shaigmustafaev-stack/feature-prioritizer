import { describe, it, expect } from "vitest"
import { pickChartType, calcDelta, formatMetricValue, migratePeriod } from "../lib/utils"
import type { Metric } from "../lib/types"

const makeMetric = (rows: number): Metric => ({
  id: "m1",
  name: "Test",
  rows: Array.from({ length: rows }, (_, i) => ({
    label: `Segment ${i}`,
    values: [100, 200, 300],
  })),
})

describe("pickChartType", () => {
  it("returns line for 1 row, 3+ periods", () => {
    expect(pickChartType(makeMetric(1), 3)).toBe("line")
  })

  it("returns bar for 1 row, 1-2 periods", () => {
    expect(pickChartType(makeMetric(1), 2)).toBe("bar")
  })

  it("returns bar (grouped) for 2-5 segments, 2+ periods", () => {
    expect(pickChartType(makeMetric(3), 3)).toBe("bar")
  })

  it("returns line for 6+ segments, 2+ periods (bar unreadable)", () => {
    expect(pickChartType(makeMetric(7), 3)).toBe("line")
  })

  it("returns pie for 1 period, 2-5 segments", () => {
    expect(pickChartType(makeMetric(3), 1)).toBe("pie")
  })

  it("returns horizontal-bar for 1 period, 6+ segments", () => {
    expect(pickChartType(makeMetric(8), 1)).toBe("horizontal-bar")
  })

  it("returns bar as fallback", () => {
    expect(pickChartType(makeMetric(1), 1)).toBe("bar")
  })
})

describe("calcDelta", () => {
  it("calculates positive delta", () => {
    const result = calcDelta([100, 150])
    expect(result.value).toBe(50)
    expect(result.percent).toBeCloseTo(50)
  })

  it("calculates negative delta", () => {
    const result = calcDelta([200, 150])
    expect(result.value).toBe(-50)
    expect(result.percent).toBeCloseTo(-25)
  })

  it("returns zero for single value", () => {
    const result = calcDelta([100])
    expect(result.value).toBe(0)
    expect(result.percent).toBe(0)
  })

  it("returns zero for empty array", () => {
    const result = calcDelta([])
    expect(result.value).toBe(0)
    expect(result.percent).toBe(0)
  })

  it("handles zero base (avoid division by zero)", () => {
    const result = calcDelta([0, 100])
    expect(result.value).toBe(100)
    expect(result.percent).toBe(0)
  })
})

describe("formatMetricValue", () => {
  it("formats millions", () => {
    expect(formatMetricValue(1500000)).toBe("1.5M")
  })

  it("formats thousands", () => {
    expect(formatMetricValue(340000)).toBe("340K")
  })

  it("formats small numbers as-is", () => {
    expect(formatMetricValue(42)).toBe("42")
  })

  it("formats exact million", () => {
    expect(formatMetricValue(1000000)).toBe("1M")
  })

  it("formats exact thousand", () => {
    expect(formatMetricValue(1000)).toBe("1K")
  })

  it("handles zero", () => {
    expect(formatMetricValue(0)).toBe("0")
  })
})

describe("migratePeriod", () => {
  it("passes through new format unchanged", () => {
    expect(migratePeriod({ label: "Q1 2025" })).toEqual({ label: "Q1 2025" })
  })

  it("converts old format { month: 0, year: 2025 } to label", () => {
    const result = migratePeriod({ month: 0, year: 2025 })
    expect(result.label).toBeTruthy()
    expect(typeof result.label).toBe("string")
  })

  it("converts month 11 year 2024", () => {
    const result = migratePeriod({ month: 11, year: 2024 })
    expect(result.label).toBeTruthy()
  })
})
