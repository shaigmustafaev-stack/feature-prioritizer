"use client";

import { DashboardView } from "../../components/DashboardView";
import type { Metric, Period, Insight } from "../../lib/types";

interface DashboardViewWrapperProps {
  metrics: Metric[];
  periods: Period[];
  insights: Insight[];
  notes?: Record<string, string>;
}

export function DashboardViewWrapper({ metrics, periods, insights, notes }: DashboardViewWrapperProps) {
  return <DashboardView metrics={metrics} periods={periods} insights={insights} notes={notes} />;
}
