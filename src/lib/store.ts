"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { todayISO } from "./dates";
import type { SyncData } from "./merge";
import type { DayRecord, MealLog, SetTag, UserSettings, WeightLog, WorkoutSet } from "./types";

interface AppState {
  settings: UserSettings | null;
  sets: WorkoutSet[];
  meals: MealLog[];
  weights: WeightLog[];
  days: Record<string, DayRecord>;
  /** Account whose data this device holds (null = anonymous local data). */
  ownerId: string | null;
  /** True while local changes may not have reached the server yet. */
  dirty: boolean;

  /** Replace synced data wholesale (used by cloud sync). */
  applyData: (d: SyncData, ownerId: string | null) => void;
  setDirty: (dirty: boolean) => void;
  saveSettings: (s: UserSettings) => void;
  setLang: (lang: UserSettings["lang"]) => void;
  logSet: (input: Omit<WorkoutSet, "id" | "createdAt">) => void;
  toggleSetTag: (id: string, tag: SetTag) => void;
  removeSet: (id: string) => void;
  addMeal: (input: Omit<MealLog, "id" | "createdAt">) => void;
  removeMeal: (id: string) => void;
  logWeight: (date: string, weightKg: number) => void;
  addWater: (date: string, ml: number) => void;
  setRest: (date: string, isRest: boolean) => void;
  restartProgram: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const emptyDay = (date: string): DayRecord => ({ date, isRest: false, waterMl: 0 });

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: null,
      sets: [],
      meals: [],
      weights: [],
      days: {},
      ownerId: null,
      dirty: false,

      applyData: (d, ownerId) => set({ ...d, ownerId }),
      setDirty: (dirty) => set({ dirty }),
      saveSettings: (s) =>
        set((st) => {
          const today = todayISO();
          // A changed profile weight counts as today's weigh-in so targets recompute.
          const weightChanged = !st.settings || st.settings.weightKg !== s.weightKg;
          const existing = st.weights.find((w) => w.date === today);
          // Keep a real check-in as a check-in; only mark brand-new entries as profile-sourced.
          const entry: WeightLog =
            existing && existing.source !== "profile"
              ? { date: today, weightKg: s.weightKg }
              : { date: today, weightKg: s.weightKg, source: "profile" };
          const weights = weightChanged
            ? [...st.weights.filter((w) => w.date !== today), entry]
            : st.weights;
          return { settings: s, weights };
        }),
      setLang: (lang) => set((st) => (st.settings ? { settings: { ...st.settings, lang } } : st)),

      logSet: (input) =>
        set((st) => ({ sets: [...st.sets, { ...input, id: uid(), createdAt: Date.now() }] })),
      toggleSetTag: (id, tag) =>
        set((st) => ({
          sets: st.sets.map((s) =>
            s.id !== id
              ? s
              : { ...s, tags: s.tags.includes(tag) ? s.tags.filter((t) => t !== tag) : [...s.tags, tag] },
          ),
        })),
      removeSet: (id) => set((st) => ({ sets: st.sets.filter((s) => s.id !== id) })),

      addMeal: (input) =>
        set((st) => ({ meals: [...st.meals, { ...input, id: uid(), createdAt: Date.now() }] })),
      removeMeal: (id) => set((st) => ({ meals: st.meals.filter((m) => m.id !== id) })),

      logWeight: (date, weightKg) =>
        set((st) => ({
          weights: [...st.weights.filter((w) => w.date !== date), { date, weightKg }].sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        })),
      addWater: (date, ml) =>
        set((st) => {
          const cur = st.days[date] ?? emptyDay(date);
          return { days: { ...st.days, [date]: { ...cur, waterMl: Math.max(0, cur.waterMl + ml) } } };
        }),
      setRest: (date, isRest) =>
        set((st) => ({ days: { ...st.days, [date]: { ...(st.days[date] ?? emptyDay(date)), isRest } } })),

      // History is keyed by date, so a new run never deletes logs or weights.
      restartProgram: () =>
        set((st) => (st.settings ? { settings: { ...st.settings, programStart: todayISO() } } : st)),
    }),
    {
      name: "volt-burn-fit-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
