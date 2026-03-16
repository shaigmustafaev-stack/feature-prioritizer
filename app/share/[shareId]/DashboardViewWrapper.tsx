"use client";

import { DashboardView } from "../../components/DashboardView";
import type { Metric, Period, Insight } from "../../lib/types";

interface DashboardViewWrapperProps {
  metrics: Metric[];
  periods: Period[];
  insights: Insight[];
}

export function DashboardViewWrapper({ metrics, periods, insights }: DashboardViewWrapperProps) {
  return <DashboardView metrics={metrics} periods={periods} insights={insights} />;
}
