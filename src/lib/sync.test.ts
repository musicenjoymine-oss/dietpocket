import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { emptySyncData, mergeData, type SyncData } from "./merge";
import { deleteSets, pullAll, pushAll } from "./syncRemote";

type Row = Record<string, unknown>;

/** Minimal in-memory stand-in for the PostgREST calls syncRemote makes. */
function fakeDb(): SupabaseClient {
  const tables: Record<string, Row[]> = {};
  const pk: Record<string, string[]> = {
    profiles: ["user_id"], workout_sets: ["user_id", "id"], meal_logs: ["user_id", "id"],
    weight_logs: ["user_id", "date"], day_records: ["user_id", "date"],
  };
  const from = (name: string) => {
    const rows = (tables[name] ??= []);
    const filters: Array<(r: Row) => boolean> = [];
    let mode: "select" | "delete" = "select";
    const run = () => {
      const hit = rows.filter((r) => filters.every((f) => f(r)));
      if (mode === "delete") for (const h of hit) rows.splice(rows.indexOf(h), 1);
      return { data: hit, error: null };
    };
    const q = {
      select: () => q,
      delete: () => { mode = "delete"; return q; },
      eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return q; },
      in: (c: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[c])); return q; },
      maybeSingle: async () => ({ data: run().data[0] ?? null, error: null }),
      upsert: async (input: Row | Row[]) => {
        for (const r of Array.isArray(input) ? input : [input]) {
          const i = rows.findIndex((x) => pk[name].every((k) => x[k] === r[k]));
          if (i >= 0) rows[i] = r; else rows.push(r);
        }
        return { error: null };
      },
      then: (res: (v: unknown) => unknown) => Promise.resolve(run()).then(res),
    };
    return q;
  };
  return { from } as unknown as SupabaseClient;
}

const settings = {
  lang: "en", age: 24, sex: "male", heightCm: 178, weightKg: 125, goalWeightKg: 80,
  activity: "light", deficitPct: 0.15, programStart: "2026-01-01",
} as const;

const data: SyncData = {
  settings: { ...settings },
  sets: [{ id: "a", date: "2026-01-01", exerciseId: "squat", weightKg: 40, reps: 8, tags: ["too_light"], note: "hi", createdAt: 1 }],
  meals: [{ id: "m", date: "2026-01-01", name: "Egg", kcal: 156, proteinG: 13, carbG: 1, fatG: 11, createdAt: 2 }],
  weights: [{ date: "2026-01-01", weightKg: 125, source: "profile" }, { date: "2026-01-02", weightKg: 124.5 }],
  days: { "2026-01-01": { date: "2026-01-01", isRest: true, waterMl: 500 } },
};

test("push then pull round-trips every field", async () => {
  const db = fakeDb();
  await pushAll(db, "u1", data);
  assert.deepEqual(await pullAll(db, "u1"), data);
});

test("data is scoped per user and deletes work", async () => {
  const db = fakeDb();
  await pushAll(db, "u1", data);
  assert.deepEqual(await pullAll(db, "u2"), emptySyncData());
  await deleteSets(db, "u1", ["a"]);
  assert.equal((await pullAll(db, "u1")).sets.length, 0);
});

test("merge keeps local-only items, remote wins conflicts", () => {
  const local: SyncData = { ...emptySyncData(), weights: [{ date: "d1", weightKg: 80 }, { date: "d2", weightKg: 81 }] };
  const server: SyncData = { ...emptySyncData(), weights: [{ date: "d1", weightKg: 79 }], settings: { ...settings } };
  const m = mergeData(local, server);
  assert.deepEqual(m.weights, [{ date: "d1", weightKg: 79 }, { date: "d2", weightKg: 81 }]);
  assert.ok(m.settings);
});
