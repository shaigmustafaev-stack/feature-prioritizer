// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/tools/analytics",
}))

// Mock useAuth — define user INSIDE factory to keep reference stable
vi.mock("../hooks/useAuth", () => {
  const mockUser = { id: "test-user-id", email: "test@test.com" }
  return { useAuth: () => ({ user: mockUser, loading: false, logout: vi.fn() }) }
})

// Mock supabase-browser
vi.mock("../lib/supabase-browser", () => ({
  supabaseBrowser: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "test-user-id" } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  }),
}))

const MOCK_DASHBOARDS = [
  {
    id: "dash-1",
    name: "Test Dashboard",
    data: { periods: [{ month: 0, year: 2025 }], metrics: [], insights: [] },
    share_id: null,
    user_id: "test-user-id",
    created_at: "2025-01-01T00:00:00Z",
  },
]

function makeFetchMock() {
  return async (url: string, init?: RequestInit) => {
    const method = init?.method || "GET"
    if (url === "/api/analytics/dashboards" && method === "GET") {
      return new Response(JSON.stringify(MOCK_DASHBOARDS))
    }
    if (url === "/api/analytics/dashboards" && method === "POST") {
      return new Response(JSON.stringify({ id: "new-dash", name: "Новый дашборд" }))
    }
    return new Response(JSON.stringify({ success: true }))
  }
}

beforeEach(() => {
  global.fetch = vi.fn(makeFetchMock()) as unknown as typeof fetch
  localStorage.clear()
  localStorage.setItem("producthub-migrated:test-user-id", "true")
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("Analytics list page", () => {
  it("renders the page title", async () => {
    const { default: AnalyticsListPage } = await import("../tools/analytics/page")
    render(<AnalyticsListPage />)
    expect(await screen.findByText(/Аналитика продукта/)).toBeInTheDocument()
  })

  it("renders dashboard list", async () => {
    const { default: AnalyticsListPage } = await import("../tools/analytics/page")
    render(<AnalyticsListPage />)
    expect(await screen.findByText("Test Dashboard")).toBeInTheDocument()
  })

  it("shows create button", async () => {
    const { default: AnalyticsListPage } = await import("../tools/analytics/page")
    render(<AnalyticsListPage />)
    expect(await screen.findByText("+ Новый дашборд")).toBeInTheDocument()
  })
})
