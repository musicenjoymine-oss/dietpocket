import type { DayRecord, MealLog, UserSettings, WeightLog, WorkoutSet } from "./types";

/** The synced slice of app state. */
export interface SyncData {
  settings: UserSettings | null;
  sets: WorkoutSet[];
  meals: MealLog[];
  weights: WeightLog[];
  days: Record<string, DayRecord>;
}

function unionBy<T>(local: T[], remote: T[], key: (x: T) => string): T[] {
  const out = new Map(local.map((x) => [key(x), x]));
  for (const r of remote) out.set(key(r), r); // remote wins on conflict
  return [...out.values()];
}

/**
 * Combine device-local data with the account's data. Used when a device that
 * already has logs signs in: nothing is lost, and the server wins ties.
 */
export function mergeData(local: SyncData, remote: SyncData): SyncData {
  return {
    settings: remote.settings ?? local.settings,
    sets: unionBy(local.sets, remote.sets, (s) => s.id).sort((a, b) => a.createdAt - b.createdAt),
    meals: unionBy(local.meals, remote.meals, (m) => m.id).sort((a, b) => a.createdAt - b.createdAt),
    weights: unionBy(local.weights, remote.weights, (w) => w.date).sort((a, b) => a.date.localeCompare(b.date)),
    days: { ...local.days, ...remote.days },
  };
}

export const emptySyncData = (): SyncData => ({ settings: null, sets: [], meals: [], weights: [], days: {} });
