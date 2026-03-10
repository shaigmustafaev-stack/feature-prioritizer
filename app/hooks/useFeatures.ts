"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import type { Feature, Status } from "../lib/types";
import { DEMO_FEATURES } from "../lib/constants";

// ─── localStorage ключи для анонимного режима ─────────────────────────────────
const ANON_KEY = "producthub-anon-features";
const ANON_SEEDED_KEY = "producthub-demo-seeded:anon";
const MIGRATED_KEY = "producthub-migrated";

let anonNextId = Date.now();

function loadAnon(): Feature[] {
  try {
    const raw = localStorage.getItem(ANON_KEY);
    return raw ? (JSON.parse(raw) as Feature[]) : [];
  } catch {
    return [];
  }
}

function saveAnon(features: Feature[]): void {
  localStorage.setItem(ANON_KEY, JSON.stringify(features));
}

function seedAnon(): Feature[] {
  const demos: Feature[] = DEMO_FEATURES.map((f, i) => ({ ...f, id: Date.now() + i }));
  saveAnon(demos);
  localStorage.setItem(ANON_SEEDED_KEY, "true");
  return demos;
}

// Минимальный тип пользователя — чтобы не импортировать весь @supabase/supabase-js
type AuthUser = { id: string; email?: string | null };

// ─── Основной хук ─────────────────────────────────────────────────────────────

export function useFeatures(user: AuthUser | null) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const migratedRef = useRef(false);

  // ── Загрузка ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoaded(false);
    setFeatures([]);

    if (user === null) {
      // Анонимный режим — данные из localStorage
      const existing = loadAnon();
      if (existing.length === 0 && !localStorage.getItem(ANON_SEEDED_KEY)) {
        setFeatures(seedAnon());
      } else {
        setFeatures(existing);
      }
      setLoaded(true);
      return;
    }

    // Авторизованный режим — данные из Supabase
    const load = async () => {
      try {
        // Миграция анонимных данных (однократно на устройство)
        if (!migratedRef.current && !localStorage.getItem(MIGRATED_KEY)) {
          migratedRef.current = true;
          const anonFeatures = loadAnon();
          if (anonFeatures.length > 0) {
            await Promise.all(
              anonFeatures.map(f =>
                fetch("/api/features", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: f.name,
                    description: f.desc,
                    reach: f.reach,
                    impact: f.impact,
                    confidence: f.confidence,
                    effort: f.effort,
                    status: f.status,
                  }),
                })
              )
            );
            localStorage.removeItem(ANON_KEY);
            localStorage.removeItem(ANON_SEEDED_KEY);
          }
          localStorage.setItem(MIGRATED_KEY, "true");
        }

        const res = await fetch("/api/features");
        if (!res.ok) throw new Error("Не удалось загрузить фичи");
        const data: Feature[] = await res.json();
        setFeatures(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setLoaded(true);
      }
    };

    load();
  }, [user]);

  // ── Добавить ──────────────────────────────────────────────────────────────
  const addFeature = useCallback(async (feature: Omit<Feature, "id" | "status">): Promise<void> => {
    if (user === null) {
      const newFeature: Feature = { ...feature, id: ++anonNextId, status: "new" };
      setFeatures(prev => {
        const updated = [...prev, newFeature];
        saveAnon(updated);
        return updated;
      });
      return;
    }

    setMutating(true);
    try {
      const res = await fetch("/api/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: feature.name,
          description: feature.desc,
          reach: feature.reach,
          impact: feature.impact,
          confidence: feature.confidence,
          effort: feature.effort,
          status: "new",
        }),
      });
      if (!res.ok) throw new Error("Не удалось добавить фичу");
      const data: Feature = await res.json();
      setFeatures(prev => [...prev, data]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка добавления");
    } finally {
      setMutating(false);
    }
  }, [user]);

  // ── Удалить ───────────────────────────────────────────────────────────────
  const removeFeature = useCallback(async (id: number): Promise<void> => {
    if (user === null) {
      setFeatures(prev => {
        const updated = prev.filter(f => f.id !== id);
        saveAnon(updated);
        return updated;
      });
      return;
    }

    setFeatures(prev => prev.filter(f => f.id !== id));
    try {
      const res = await fetch("/api/features", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Не удалось удалить фичу");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления");
    }
  }, [user]);

  // ── Обновить ──────────────────────────────────────────────────────────────
  const updateFeature = useCallback(async (id: number, updates: Partial<Omit<Feature, "id">>): Promise<void> => {
    if (user === null) {
      setFeatures(prev => {
        const updated = prev.map(f => f.id === id ? { ...f, ...updates } : f);
        saveAnon(updated);
        return updated;
      });
      return;
    }

    setFeatures(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));

    const apiBody: Record<string, string | number> = { id };
    if (updates.name !== undefined) apiBody.name = updates.name;
    if (updates.desc !== undefined) apiBody.description = updates.desc;
    if (updates.reach !== undefined) apiBody.reach = updates.reach;
    if (updates.impact !== undefined) apiBody.impact = updates.impact;
    if (updates.confidence !== undefined) apiBody.confidence = updates.confidence;
    if (updates.effort !== undefined) apiBody.effort = updates.effort;
    if (updates.status !== undefined) apiBody.status = updates.status;

    try {
      const res = await fetch("/api/features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiBody),
      });
      if (!res.ok) throw new Error("Не удалось обновить фичу");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка обновления");
    }
  }, [user]);

  // ── Обновить статус ───────────────────────────────────────────────────────
  const updateStatus = useCallback(async (id: number, status: Status): Promise<void> => {
    await updateFeature(id, { status });
  }, [updateFeature]);

  // ── Очистить всё ──────────────────────────────────────────────────────────
  const clearAll = useCallback(async (): Promise<void> => {
    if (user === null) {
      setFeatures([]);
      localStorage.removeItem(ANON_KEY);
      localStorage.removeItem(ANON_SEEDED_KEY);
      return;
    }

    setFeatures([]);
    try {
      const res = await fetch("/api/features", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });
      if (!res.ok) throw new Error("Не удалось очистить бэклог");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка очистки");
    }
  }, [user]);

  return { features, loaded, error, mutating, addFeature, removeFeature, updateFeature, updateStatus, clearAll };
}
