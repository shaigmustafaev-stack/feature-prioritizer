# Auth Gate + Toast + AlertDialog Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the login wall from analytics pages so unauthenticated users can explore the tool, gating only AI-analysis/save/share behind login. Add toast feedback on save and replace native confirm() with AlertDialog.

**Architecture:** Three independent changes: (1) useAnalytics hook works without user by creating a local-only dashboard; auth-gated actions show an AuthGateDialog modal instead of silently returning. (2) Install sonner, add Toaster to layout, show toast on save. (3) Add shadcn AlertDialog component, replace confirm() in analytics list page.

**Tech Stack:** Next.js 16 (App Router), shadcn/ui v4 (base-ui), sonner, React 19

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `app/components/AuthGateDialog.tsx` | Create | Reusable "Войдите" modal (shadcn AlertDialog) |
| `components/ui/alert-dialog.tsx` | Create | shadcn AlertDialog primitive (via `npx shadcn@latest add alert-dialog`) |
| `app/hooks/useAnalytics.ts` | Modify | Work without user: local dashboard for `id==="new"`, guard analyze/save/share with `needsAuth` callback |
| `app/tools/analytics/[id]/page.tsx` | Modify | Show AuthGateDialog on guarded actions, toast on save, auto-scroll after analyze |
| `app/tools/analytics/page.tsx` | Modify | Remove login wall, redirect anon "Создать" to `/tools/analytics/new`, replace confirm() with AlertDialog |
| `app/layout.tsx` | Modify | Add `<Toaster />` from sonner |

---

## Chunk 1: Infrastructure (AlertDialog + Sonner + AuthGateDialog)

### Task 1: Install sonner and add AlertDialog component

**Files:**
- Modify: `package.json` (sonner dependency)
- Create: `components/ui/alert-dialog.tsx` (via shadcn CLI)
- Modify: `app/layout.tsx:1-39`

- [ ] **Step 1: Install sonner**

```bash
cd feature-prioritizer && npm install sonner
```

- [ ] **Step 2: Add shadcn AlertDialog**

```bash
npx shadcn@latest add alert-dialog
```

This creates `components/ui/alert-dialog.tsx` with base-ui primitives.

- [ ] **Step 3: Add Toaster to layout**

In `app/layout.tsx`, add import and component:

```tsx
import { Toaster } from "sonner";

// Inside <body>, after <Navbar />:
<Toaster position="top-center" richColors />
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit
```
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json components/ui/alert-dialog.tsx app/layout.tsx
git commit -m "chore: добавить sonner и AlertDialog"
```

### Task 2: Create AuthGateDialog component

**Files:**
- Create: `app/components/AuthGateDialog.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client"

import Link from "next/link"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

interface AuthGateDialogProps {
  open: boolean
  onClose: () => void
}

export function AuthGateDialog({ open, onClose }: AuthGateDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Войдите для AI-анализа</AlertDialogTitle>
          <AlertDialogDescription>
            Анализ, сохранение и шаринг доступны после входа
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Отмена</AlertDialogCancel>
          <AlertDialogAction render={<Link href="/login" />}>
            Войти
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

Note: shadcn v4 uses `render` prop instead of `asChild`. If AlertDialog doesn't support `render` on Action, wrap with Link manually:
```tsx
<Link href="/login">
  <AlertDialogAction>Войти</AlertDialogAction>
</Link>
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/components/AuthGateDialog.tsx
git commit -m "feat: компонент AuthGateDialog для гейта авторизации"
```

---

## Chunk 2: Remove login wall from useAnalytics + editor page

### Task 3: Update useAnalytics to work without user

**Files:**
- Modify: `app/hooks/useAnalytics.ts`

Key changes:
1. When `user === null` AND `dashboardId === "new"`: create a local empty dashboard (not fetched from API)
2. `analyze`, `save`, `share` return `"needs-auth"` when `user === null` (instead of silently returning)
3. `triggerAutoSave` skips when no user (already does this)
4. Local edits (addMetric, updateMetric, etc.) work regardless of user

- [ ] **Step 1: Modify the loading effect to support anon mode**

Replace the existing `useEffect` (lines 48-74) with:

```tsx
useEffect(() => {
  // Анонимный режим: создаём локальный пустой дашборд
  if (!user) {
    if (dashboardId === "new") {
      const local: Dashboard = {
        id: "new",
        name: "Новый дашборд",
        periods: [],
        metrics: [],
        insights: [],
        created_at: new Date().toISOString(),
        user_id: "",
      };
      setDashboard(local);
      dashboardRef.current = local;
    }
    setLoading(false);
    return;
  }

  // Авторизованный режим: загрузка из API
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      if (dashboardId === "new") {
        // Создаём новый дашборд на сервере
        const res = await fetch("/api/analytics/dashboards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Новый дашборд" }),
        });
        if (!res.ok) throw new Error("Не удалось создать дашборд");
        const row: DashboardRow = await res.json();
        const normalized = normalizeDashboardRow(row);
        setDashboard(normalized);
        dashboardRef.current = normalized;
      } else {
        const res = await fetch("/api/analytics/dashboards");
        if (!res.ok) throw new Error("Не удалось загрузить дашборды");
        const rows: DashboardRow[] = await res.json();
        const found = rows.find((r) => r.id === dashboardId);
        if (!found) throw new Error("Дашборд не найден");
        const normalized = normalizeDashboardRow(found);
        setDashboard(normalized);
        dashboardRef.current = normalized;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  load();
}, [dashboardId, user]);
```

- [ ] **Step 2: Make analyze/save/share return auth status**

Change the return type: these functions return `Promise<"needs-auth" | void>`.

For `analyze`:
```tsx
const analyze = useCallback(async (): Promise<"needs-auth" | void> => {
  if (!user) return "needs-auth";
  if (!dashboard) return;
  // ... rest unchanged
}, [dashboard, user]);
```

For `save`:
```tsx
const save = useCallback(async (): Promise<"needs-auth" | void> => {
  const current = dashboardRef.current;
  if (!user) return "needs-auth";
  if (!current) return;
  // ... rest unchanged, add toast.success("Сохранено ✓") after successful PUT
}, [user]);
```

For `share`:
```tsx
const share = useCallback(async (): Promise<"needs-auth" | void> => {
  const current = dashboardRef.current;
  if (!user) return "needs-auth";
  if (!current) return;
  // ... rest unchanged
}, [user]);
```

- [ ] **Step 3: Add DashboardRow import if not already imported**

Ensure `DashboardRow` is imported from types (needed for the new POST flow).

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/hooks/useAnalytics.ts
git commit -m "feat(analytics): useAnalytics работает без авторизации с локальным дашбордом"
```

### Task 4: Update editor page — AuthGateDialog + toast + auto-scroll

**Files:**
- Modify: `app/tools/analytics/[id]/page.tsx`

- [ ] **Step 1: Add imports and auth gate state**

Add to imports:
```tsx
import { toast } from "sonner";
import { AuthGateDialog } from "../../../components/AuthGateDialog";
```

Add state inside component:
```tsx
const [showAuthGate, setShowAuthGate] = useState(false);
```

- [ ] **Step 2: Wrap analyze/save/share calls with auth check**

Replace direct calls:

```tsx
// Analyze button onClick:
const handleAnalyze = async () => {
  const result = await analyze();
  if (result === "needs-auth") { setShowAuthGate(true); return; }
};

// Save button onClick:
const handleSave = async () => {
  const result = await save();
  if (result === "needs-auth") { setShowAuthGate(true); return; }
  toast.success("Сохранено ✓");
};

// Share button onClick:
const handleShare = async () => {
  const result = await share();
  if (result === "needs-auth") { setShowAuthGate(true); return; }
};
```

- [ ] **Step 3: Remove the "Нет авторизации" wall**

Remove the block (lines 59-65 in current file):
```tsx
// DELETE THIS BLOCK:
if (!user) {
  return (
    <div className="mx-auto max-w-[860px] px-4 py-8 text-center text-muted-foreground">
      <p>Войдите, чтобы редактировать дашборд</p>
    </div>
  );
}
```

- [ ] **Step 4: Wire up handlers and add AuthGateDialog**

Replace `onClick={save}` with `onClick={handleSave}`, `onClick={share}` with `onClick={handleShare}`, `onClick={analyze}` with `onClick={handleAnalyze}`.

Add before closing `</div>` of component:
```tsx
<AuthGateDialog open={showAuthGate} onClose={() => setShowAuthGate(false)} />
```

- [ ] **Step 5: Add auto-scroll to dashboard tab after analysis**

In `handleAnalyze`, after successful analyze:
```tsx
const handleAnalyze = async () => {
  const result = await analyze();
  if (result === "needs-auth") { setShowAuthGate(true); return; }
  // Auto-scroll to top when tab switches to dashboard
  window.scrollTo({ top: 0, behavior: "smooth" });
};
```

- [ ] **Step 6: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add app/tools/analytics/[id]/page.tsx
git commit -m "feat(analytics): убрать стену логина, AuthGateDialog, toast при сохранении"
```

---

## Chunk 3: Analytics list page — remove wall + AlertDialog for delete

### Task 5: Update analytics list page

**Files:**
- Modify: `app/tools/analytics/page.tsx`

- [ ] **Step 1: Remove the login wall block**

Remove lines 84-101 (the `if (!authLoading && !user)` return block).

- [ ] **Step 2: Update "Создать" button for anon users**

For anon users, "Создать" navigates to `/tools/analytics/new` directly (no API call needed — useAnalytics will create a local dashboard):

```tsx
const handleCreate = async () => {
  if (!user) {
    router.push("/tools/analytics/new");
    return;
  }
  // ... existing API create logic
};
```

- [ ] **Step 3: Replace confirm() with AlertDialog for delete**

Add state:
```tsx
const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
```

Replace `handleDelete`:
```tsx
const handleDelete = async (id: string) => {
  const prev = dashboards;
  setDashboards((d) => d.filter((db) => db.id !== id));
  setDeleteTarget(null);
  try {
    const res = await fetch("/api/analytics/dashboards", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error("Не удалось удалить дашборд");
  } catch (e) {
    setError(e instanceof Error ? e.message : "Ошибка удаления");
    setDashboards(prev);
  }
};
```

Change delete button: `onClick={() => setDeleteTarget(db.id)}`

Add AlertDialog at end of component:
```tsx
<AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Удалить дашборд?</AlertDialogTitle>
      <AlertDialogDescription>
        Это действие нельзя отменить. Дашборд и все данные будут удалены.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Отмена</AlertDialogCancel>
      <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)}>
        Удалить
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 4: Show empty state for anon users (no dashboard list)**

When `!user`, skip the loading/fetching, show the empty state with "Создать дашборд" button:

```tsx
// After removing the wall, the existing empty state already shows for dashboards.length === 0
// Just ensure the loading skeleton only shows when user exists and data is loading
if (user && (authLoading || !loaded)) {
  // skeleton...
}
```

- [ ] **Step 5: Add AlertDialog imports**

```tsx
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
```

- [ ] **Step 6: Verify build + tests**

```bash
npx tsc --noEmit && npm test
```
Expected: clean, 56/56 pass

- [ ] **Step 7: Commit**

```bash
git add app/tools/analytics/page.tsx
git commit -m "feat(analytics): убрать стену на списке, AlertDialog вместо confirm()"
```

---

## Final Verification

- [ ] **Full check**

```bash
npx tsc --noEmit && npm test
```
Expected: clean, all tests pass

- [ ] **Manual check list (for user)**

1. Open `/tools/analytics` without login → see empty state with "Создать"
2. Click "Создать" → navigates to `/tools/analytics/new`
3. Add metrics, periods, enter values → all works
4. Click "Анализировать" → AuthGateDialog appears
5. Click "Сохранить" → AuthGateDialog appears
6. Log in → save works, toast "Сохранено ✓" appears
7. Delete dashboard → AlertDialog confirmation instead of browser confirm()
