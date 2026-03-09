"use client";

import { useState, useEffect, useCallback } from "react";
import type { Feature, Status } from "../lib/types";
import { DEMO_FEATURES } from "../lib/constants";

function getOrCreateUserId(): string {
  const key = "producthub-user-id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

function isDemoSeeded(userId: string): boolean {
  return localStorage.getItem(`producthub-demo-seeded:${userId}`) === "true";
}

function markDemoSeeded(userId: string): void {
  localStorage.setItem(`producthub-demo-seeded:${userId}`, "true");
}

export function useFeatures() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const id = getOrCreateUserId();
    setUserId(id);

    const load = async () => {
      try {
        const res = await fetch(`/api/features?user_id=${id}`);
        if (!res.ok) throw new Error("Не удалось загрузить фичи");
        const data: Feature[] = await res.json();

        if (data.length === 0 && !isDemoSeeded(id)) {
          // Новый пользователь — сеем 3 демо-фичи однократно
          const seeded = await Promise.all(
            DEMO_FEATURES.map(f =>
              fetch("/api/features", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user_id: id,
                  name: f.name,
                  description: f.desc,
                  reach: f.reach,
                  impact: f.impact,
                  confidence: f.confidence,
                  effort: f.effort,
                  status: f.status,
                }),
              }).then(r => { if (!r.ok) throw new Error("Ошибка создания демо-фичи"); return r.json() as Promise<Feature>; })
            )
          );
          markDemoSeeded(id);
          setFeatures(seeded);
        } else {
          setFeatures(data);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setLoaded(true);
      }
    };

    load();
  }, []);

  const addFeature = useCallback(async (feature: Omit<Feature, "id" | "status">): Promise<void> => {
    if (!userId) return;
    setMutating(true);
    try {
      const res = await fetch("/api/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
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
  }, [userId]);

  const removeFeature = useCallback(async (id: number): Promise<void> => {
    if (!userId) return;
    setFeatures(prev => prev.filter(f => f.id !== id)); // оптимистично
    try {
      const res = await fetch("/api/features", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, user_id: userId }),
      });
      if (!res.ok) throw new Error("Не удалось удалить фичу");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления");
    }
  }, [userId]);

  const updateFeature = useCallback(async (id: number, updates: Partial<Omit<Feature, "id">>): Promise<void> => {
    if (!userId) return;
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f)); // оптимистично

    const apiBody: Record<string, string | number> = { id, user_id: userId };
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
  }, [userId]);

  const updateStatus = useCallback(async (id: number, status: Status): Promise<void> => {
    await updateFeature(id, { status });
  }, [updateFeature]);

  const clearAll = useCallback(async (): Promise<void> => {
    if (!userId) return;
    setFeatures([]); // оптимистично
    try {
      const res = await fetch("/api/features", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, clearAll: true }),
      });
      if (!res.ok) throw new Error("Не удалось очистить бэклог");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка очистки");
    }
  }, [userId]);

  return { features, loaded, error, mutating, addFeature, removeFeature, updateFeature, updateStatus, clearAll };
}
