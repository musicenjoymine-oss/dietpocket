import type { SupabaseClient } from "@supabase/supabase-js";
import type { SyncData } from "./merge";
import type { DayRecord, MealLog, SetTag, UserSettings, WeightLog, WorkoutSet } from "./types";

interface SetRow { id: string; date: string; exercise_id: string; weight_kg: number; reps: number; tags: SetTag[]; note: string | null; created_at: number }
interface MealRow { id: string; date: string; name: string; kcal: number; protein_g: number; carb_g: number; fat_g: number; created_at: number }
interface WeightRow { date: string; weight_kg: number; source: "profile" | null }
interface DayRow { date: string; is_rest: boolean; water_ml: number }
interface ProfileRow { settings: UserSettings }

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

const toSetRow = (userId: string, s: WorkoutSet) => ({
  user_id: userId, id: s.id, date: s.date, exercise_id: s.exerciseId, weight_kg: s.weightKg,
  reps: s.reps, tags: s.tags, note: s.note ?? null, created_at: s.createdAt,
});
const toMealRow = (userId: string, m: MealLog) => ({
  user_id: userId, id: m.id, date: m.date, name: m.name, kcal: m.kcal, protein_g: m.proteinG,
  carb_g: m.carbG, fat_g: m.fatG, created_at: m.createdAt,
});
const toWeightRow = (userId: string, w: WeightLog) => ({
  user_id: userId, date: w.date, weight_kg: w.weightKg, source: w.source ?? null,
});
const toDayRow = (userId: string, d: DayRecord) => ({
  user_id: userId, date: d.date, is_rest: d.isRest, water_ml: d.waterMl,
});

export async function pullAll(db: SupabaseClient, userId: string): Promise<SyncData> {
  const [profile, sets, meals, weights, days] = await Promise.all([
    db.from("profiles").select("settings").eq("user_id", userId).maybeSingle(),
    db.from("workout_sets").select("*").eq("user_id", userId),
    db.from("meal_logs").select("*").eq("user_id", userId),
    db.from("weight_logs").select("*").eq("user_id", userId),
    db.from("day_records").select("*").eq("user_id", userId),
  ]);
  for (const r of [profile, sets, meals, weights, days]) fail(r.error);

  return {
    settings: (profile.data as ProfileRow | null)?.settings ?? null,
    sets: ((sets.data ?? []) as SetRow[]).map((r) => ({
      id: r.id, date: r.date, exerciseId: r.exercise_id, weightKg: Number(r.weight_kg), reps: r.reps,
      tags: r.tags, note: r.note ?? undefined, createdAt: Number(r.created_at),
    })),
    meals: ((meals.data ?? []) as MealRow[]).map((r) => ({
      id: r.id, date: r.date, name: r.name, kcal: Number(r.kcal), proteinG: Number(r.protein_g),
      carbG: Number(r.carb_g), fatG: Number(r.fat_g), createdAt: Number(r.created_at),
    })),
    weights: ((weights.data ?? []) as WeightRow[]).map((r) => ({
      date: r.date, weightKg: Number(r.weight_kg), ...(r.source ? { source: r.source } : {}),
    })),
    days: Object.fromEntries(
      ((days.data ?? []) as DayRow[]).map((r) => [r.date, { date: r.date, isRest: r.is_rest, waterMl: r.water_ml }]),
    ),
  };
}

export async function upsertSettings(db: SupabaseClient, userId: string, settings: UserSettings) {
  fail((await db.from("profiles").upsert({ user_id: userId, settings, updated_at: new Date().toISOString() })).error);
}
export async function upsertSets(db: SupabaseClient, userId: string, rows: WorkoutSet[]) {
  if (rows.length) fail((await db.from("workout_sets").upsert(rows.map((r) => toSetRow(userId, r)))).error);
}
export async function upsertMeals(db: SupabaseClient, userId: string, rows: MealLog[]) {
  if (rows.length) fail((await db.from("meal_logs").upsert(rows.map((r) => toMealRow(userId, r)))).error);
}
export async function upsertWeights(db: SupabaseClient, userId: string, rows: WeightLog[]) {
  if (rows.length) fail((await db.from("weight_logs").upsert(rows.map((r) => toWeightRow(userId, r)))).error);
}
export async function upsertDays(db: SupabaseClient, userId: string, rows: DayRecord[]) {
  if (rows.length) fail((await db.from("day_records").upsert(rows.map((r) => toDayRow(userId, r)))).error);
}
export async function deleteSets(db: SupabaseClient, userId: string, ids: string[]) {
  if (ids.length) fail((await db.from("workout_sets").delete().eq("user_id", userId).in("id", ids)).error);
}
export async function deleteMeals(db: SupabaseClient, userId: string, ids: string[]) {
  if (ids.length) fail((await db.from("meal_logs").delete().eq("user_id", userId).in("id", ids)).error);
}

export async function pushAll(db: SupabaseClient, userId: string, d: SyncData) {
  if (d.settings) await upsertSettings(db, userId, d.settings);
  await upsertSets(db, userId, d.sets);
  await upsertMeals(db, userId, d.meals);
  await upsertWeights(db, userId, d.weights);
  await upsertDays(db, userId, Object.values(d.days));
}
