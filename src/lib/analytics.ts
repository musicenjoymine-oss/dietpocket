import { addDays, daysBetween } from "./dates";
import { calcEnergyProfile, KCAL_PER_KG_FAT } from "./nutrition";
import type { TrendStatus, UserSettings, WeightLog } from "./types";

export interface TrendPoint {
  date: string;
  expected: number;
  actual: number | null;
}

/**
 * Expected trajectory: simulate day by day from the starting weight. Each day's
 * deficit is recomputed from the simulated weight, so the line naturally
 * flattens as TDEE falls (no hardcoded kg/week).
 */
export function expectedWeightOn(s: UserSettings, startWeightKg: number, days: number): number {
  let w = startWeightKg;
  for (let i = 0; i < days; i++) {
    const { deficitKcal } = calcEnergyProfile(s, w);
    w -= deficitKcal / KCAL_PER_KG_FAT;
  }
  return w;
}

export function startWeight(s: UserSettings, logs: WeightLog[]): number {
  const first = logs
    .filter((l) => l.date >= s.programStart)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return first ? first.weightKg : s.weightKg;
}

export function buildTrend(s: UserSettings, logs: WeightLog[], today: string, horizonDays = 28): TrendPoint[] {
  const start = startWeight(s, logs);
  const byDate = new Map(logs.map((l) => [l.date, l.weightKg]));
  const elapsed = Math.max(0, daysBetween(s.programStart, today));
  const span = Math.max(horizonDays - 1, elapsed);
  const points: TrendPoint[] = [];
  let w = start;
  for (let i = 0; i <= span; i++) {
    const date = addDays(s.programStart, i);
    points.push({
      date,
      expected: Math.round(w * 100) / 100,
      actual: byDate.get(date) ?? null,
    });
    w -= calcEnergyProfile(s, w).deficitKcal / KCAL_PER_KG_FAT;
  }
  return points;
}

/** Compare the latest actual weigh-in to the expected line, with a tolerance band. */
export function trendStatus(points: TrendPoint[], today: string): { status: TrendStatus; deltaKg: number } {
  const actuals = points.filter((p) => p.actual !== null && p.date <= today);
  if (actuals.length < 2) return { status: "no_data", deltaKg: 0 };
  const recent = actuals.slice(-3);
  const avgActual = recent.reduce((a, p) => a + (p.actual as number), 0) / recent.length;
  const avgExpected = recent.reduce((a, p) => a + p.expected, 0) / recent.length;
  const deltaKg = Math.round((avgActual - avgExpected) * 100) / 100;
  // Tolerance scales with body weight (daily water noise is roughly proportional).
  const tolerance = Math.max(0.2, avgExpected * 0.004);
  if (deltaKg < -tolerance) return { status: "ahead", deltaKg };
  if (deltaKg > tolerance) return { status: "behind", deltaKg };
  return { status: "on_track", deltaKg };
}
