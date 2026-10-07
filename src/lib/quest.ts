import { addDays, daysBetween } from "./dates";
import type {
  DayRecord, Exercise, MacroTargets, MealLog, NodeState, QuestNode, SetTag, WeightLog, WorkoutSet,
} from "./types";

export const QUEST_LENGTH = 28;
export const INITIAL_FREEZES = 2;
export const WEIGHT_STEP_KG = 2.5;
/** A day keeps the streak alive when at least this many of the 3 quests are done. */
export const TASKS_FOR_STREAK = 2;

export const EXERCISES: Exercise[] = [
  { id: "squat", defaultKg: 40, defaultReps: 8 },
  { id: "bench", defaultKg: 30, defaultReps: 8 },
  { id: "deadlift", defaultKg: 50, defaultReps: 5 },
  { id: "ohp", defaultKg: 20, defaultReps: 8 },
  { id: "row", defaultKg: 30, defaultReps: 10 },
  { id: "pullup", defaultKg: 0, defaultReps: 6 },
];

export interface DayData {
  sets: WorkoutSet[];
  meals: MealLog[];
  weights: WeightLog[];
  days: Record<string, DayRecord>;
}

export function tasksDoneOn(date: string, d: DayData) {
  const rec = d.days[date];
  return {
    workout: d.sets.some((s) => s.date === date),
    meal: d.meals.some((m) => m.date === date),
    checkin: d.weights.some((w) => w.date === date) || (rec?.waterMl ?? 0) > 0,
  };
}

function countDone(t: ReturnType<typeof tasksDoneOn>): number {
  return Number(t.workout) + Number(t.meal) + Number(t.checkin);
}

export function dayNumber(programStart: string, today: string): number {
  return daysBetween(programStart, today) + 1;
}

export function buildQuestMap(programStart: string, today: string, d: DayData): QuestNode[] {
  return Array.from({ length: QUEST_LENGTH }, (_, i) => {
    const date = addDays(programStart, i);
    const tasksDone = tasksDoneOn(date, d);
    const isRest = d.days[date]?.isRest ?? false;
    let state: NodeState;
    if (date > today) state = "locked";
    else if (isRest) state = "rest";
    else if (countDone(tasksDone) >= TASKS_FOR_STREAK) state = "completed";
    else if (date === today) state = "today";
    else state = "missed";
    // Today stays the highlighted entry node until it is finished.
    return { day: i + 1, date, state, tasksDone };
  });
}

export interface StreakInfo {
  streak: number;
  freezesLeft: number;
}

/**
 * Walk the run from Day 1 to today. Completed or rest days extend the streak.
 * A missed past day burns a Streak Freeze if one is left; otherwise it resets.
 * Today never breaks the streak - it can still be completed.
 */
export function computeStreak(nodes: QuestNode[]): StreakInfo {
  let streak = 0;
  let freezes = INITIAL_FREEZES;
  for (const n of nodes) {
    if (n.state === "locked") break;
    if (n.state === "completed" || n.state === "rest") streak += 1;
    else if (n.state === "missed") {
      if (freezes > 0) freezes -= 1;
      else streak = 0;
    }
  }
  return { streak, freezesLeft: freezes };
}

export interface NextSuggestion {
  weightKg: number;
  reps: number;
  reason: SetTag | null;
}

/** Adaptive difficulty: derive next load from the most recent set's quick tags. */
export function suggestNext(exercise: Exercise, sets: WorkoutSet[]): NextSuggestion {
  const last = sets
    .filter((s) => s.exerciseId === exercise.id)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  if (!last) return { weightKg: exercise.defaultKg, reps: exercise.defaultReps, reason: null };
  if (last.tags.includes("too_light")) {
    return { weightKg: last.weightKg + WEIGHT_STEP_KG, reps: last.reps, reason: "too_light" };
  }
  if (last.tags.includes("too_heavy")) {
    return { weightKg: Math.max(0, last.weightKg - WEIGHT_STEP_KG), reps: last.reps, reason: "too_heavy" };
  }
  if (last.tags.includes("form_stuck")) {
    return { weightKg: last.weightKg, reps: last.reps, reason: "form_stuck" };
  }
  return { weightKg: last.weightKg, reps: last.reps, reason: null };
}

export function waterGoalMl(weightKg: number): number {
  return Math.round((weightKg * 35) / 50) * 50;
}

export interface Stats {
  xp: number;
  level: number;
  levelProgress: number; // 0..1
  badges: string[];
}

export const XP_PER_LEVEL = 200;

export function computeStats(
  nodes: QuestNode[],
  d: DayData,
  streak: number,
  targets: MacroTargets,
  weightKg: number,
): Stats {
  let xp = d.sets.length * 10 + d.meals.length * 10;
  const badges = new Set<string>();
  if (d.sets.length > 0) badges.add("first_set");
  if (d.sets.some((s) => s.tags.length > 0)) badges.add("tagger");

  const goalWater = waterGoalMl(weightKg);
  for (const n of nodes) {
    if (n.state === "locked") continue;
    const rec = d.days[n.date];
    if (n.tasksDone.checkin) xp += 15;
    if (n.state === "completed") xp += 30;
    if (n.state === "rest") {
      xp += 10;
      badges.add("rest_wise");
    }
    if (n.tasksDone.workout && n.tasksDone.meal && n.tasksDone.checkin) badges.add("perfect_day");
    if ((rec?.waterMl ?? 0) >= goalWater) badges.add("hydrated");
    const eaten = d.meals.filter((m) => m.date === n.date).reduce((a, m) => a + m.proteinG, 0);
    if (eaten >= targets.proteinG) badges.add("protein_hero");
  }
  if (streak >= 7) badges.add("streak_7");
  if (streak >= 14) badges.add("streak_14");
  if (streak >= 28) badges.add("streak_28");

  return {
    xp,
    level: Math.floor(xp / XP_PER_LEVEL) + 1,
    levelProgress: (xp % XP_PER_LEVEL) / XP_PER_LEVEL,
    badges: [...badges],
  };
}

export const ALL_BADGES = [
  "first_set", "tagger", "rest_wise", "perfect_day", "hydrated", "protein_hero",
  "streak_7", "streak_14", "streak_28",
] as const;
