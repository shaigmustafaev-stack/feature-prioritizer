"use client";

import { useState, useEffect } from "react";
import type { Feature, Status } from "../lib/types";
import { STORAGE_KEY, DEMO_FEATURES } from "../lib/constants";

export function useFeatures() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Feature[] = JSON.parse(saved).map((f: Feature) => ({
          ...f,
          status: f.status ?? "new",
        }));
        setFeatures(parsed);
      } else {
        setFeatures(DEMO_FEATURES);
      }
    } catch {
      setFeatures(DEMO_FEATURES);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(features));
  }, [features, loaded]);

  const addFeature = (feature: Omit<Feature, "id" | "status">): void => {
    setFeatures(prev => [...prev, { ...feature, id: Date.now(), status: "new" }]);
  };

  const removeFeature = (id: number): void => {
    setFeatures(prev => prev.filter(f => f.id !== id));
  };

  const updateFeature = (id: number, updates: Partial<Omit<Feature, "id">>): void => {
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const updateStatus = (id: number, status: Status): void => {
    updateFeature(id, { status });
  };

  const clearAll = (): void => {
    setFeatures([]);
  };

  return { features, loaded, addFeature, removeFeature, updateFeature, updateStatus, clearAll };
}
