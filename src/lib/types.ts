export type Lang = "zh-TW" | "en";
export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type SetTag = "too_light" | "too_heavy" | "form_stuck";
export type CoachId = "fitness_coach" | "daily_motivator" | "nutrition_advisor";
export type NodeState = "completed" | "rest" | "today" | "missed" | "locked";
export type TrendStatus = "ahead" | "on_track" | "behind" | "no_data";

/** Profile that drives every calculation. All fields are user-entered. */
export interface UserSettings {
  lang: Lang;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  activity: ActivityLevel;
  /** Deficit as a fraction of TDEE, e.g. 0.2 = 20%. */
  deficitPct: number;
  /** ISO date (YYYY-MM-DD) of Day 1 of the current 28-day run. */
  programStart: string;
}

export interface WorkoutSet {
  id: string;
  date: string;
  exerciseId: string;
  weightKg: number;
  reps: number;
  tags: SetTag[];
  note?: string;
  createdAt: number;
}

export interface MealLog {
  id: string;
  date: string;
  name: string;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  createdAt: number;
}

export interface WeightLog {
  date: string;
  weightKg: number;
  /** "profile" = entered while editing the profile; it must not count as the daily check-in quest. */
  source?: "profile";
}

/** Per-day state that is not a list of sets/meals. */
export interface DayRecord {
  date: string;
  isRest: boolean;
  waterMl: number;
}

export interface QuestNode {
  day: number; // 1..28
  date: string;
  state: NodeState;
  tasksDone: { workout: boolean; meal: boolean; checkin: boolean };
}

export interface MacroTargets {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

/** Why the engine adjusted what the user asked for. Always shown to the user. */
export type HealthNote = "underweight" | "deficit_capped" | "floor_applied" | "goal_too_low" | "at_goal";

export interface EnergyProfile {
  bmr: number;
  tdee: number;
  bmi: number;
  deficitKcal: number;
  /** Expected loss per week implied by the deficit (kg). */
  weeklyLossKg: number;
  notes: HealthNote[];
  targets: MacroTargets;
  /** Weight actually used (smoothed) so targets don't jump daily. */
  basisWeightKg: number;
}

export interface Exercise {
  id: string;
  /** Default starting load if user has never logged this lift. */
  defaultKg: number;
  defaultReps: number;
}

export interface CoachContext {
  lang: Lang;
  bmr: number;
  tdee: number;
  targets: MacroTargets;
  consumed: MacroTargets;
  remainingKcal: number;
  remainingProteinG: number;
  bmi: number;
  healthNotes: HealthNote[];
  streak: number;
  dayNumber: number;
  isRestDay: boolean;
  trendStatus: TrendStatus;
  weightKg: number;
  goalWeightKg: number;
  todaySets: Array<{ exercise: string; weightKg: number; reps: number; tags: SetTag[]; note?: string }>;
  tagCounts: Record<SetTag, number>;
}

export interface CoachMessage {
  role: "user" | "coach";
  text: string;
}
