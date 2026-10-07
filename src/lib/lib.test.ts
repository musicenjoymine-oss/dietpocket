import assert from "node:assert/strict";
import test from "node:test";
import { calcBMR, calcEnergyProfile } from "./nutrition";
import { buildQuestMap, computeStreak, suggestNext, EXERCISES } from "./quest";
import { buildTrend, trendStatus } from "./analytics";
import type { UserSettings, WorkoutSet } from "./types";

const s: UserSettings = {
  lang: "en", age: 30, sex: "male", heightCm: 180, weightKg: 80, goalWeightKg: 72,
  activity: "moderate", deficitPct: 0.2, programStart: "2026-01-01",
};

test("Mifflin-St Jeor", () => {
  assert.equal(calcBMR(s), 1780); // 800+1125-150+5
  assert.equal(calcBMR({ ...s, sex: "female" }), 1614);
});

test("targets recompute when weight changes", () => {
  const a = calcEnergyProfile(s, 80);
  const b = calcEnergyProfile(s, 75);
  assert.ok(b.targets.kcal < a.targets.kcal);
  assert.ok(b.targets.proteinG < a.targets.proteinG);
});

test("rest day keeps streak; freeze absorbs one miss", () => {
  const days = { "2026-01-02": { date: "2026-01-02", isRest: true, waterMl: 0 } };
  const meal = (date: string) => ({ id: date, date, name: "x", kcal: 1, proteinG: 0, carbG: 0, fatG: 0, createdAt: 0 });
  const weight = (date: string) => ({ date, weightKg: 80 });
  const data = {
    sets: [], days,
    meals: [meal("2026-01-01"), meal("2026-01-04")],
    weights: [weight("2026-01-01"), weight("2026-01-04")],
  };
  const nodes = buildQuestMap(s.programStart, "2026-01-04", data);
  const r = computeStreak(nodes);
  assert.equal(r.streak, 3); // d1 done, d2 rest, d3 frozen, d4 done
  assert.equal(r.freezesLeft, 1);
});

test("#太輕 suggests +2.5kg", () => {
  const ex = EXERCISES[0];
  const set: WorkoutSet = { id: "1", date: "d", exerciseId: ex.id, weightKg: 50, reps: 8, tags: ["too_light"], createdAt: 1 };
  assert.equal(suggestNext(ex, [set]).weightKg, 52.5);
});

test("trend status", () => {
  const pts = buildTrend(s, [], "2026-01-10");
  const logs = pts.slice(0, 4).map((p) => ({ ...p, actual: p.expected - 1 }));
  assert.equal(trendStatus(logs, "2026-01-04").status, "ahead");
  assert.equal(trendStatus(pts.slice(0, 4).map((p) => ({ ...p, actual: p.expected + 1 })), "2026-01-04").status, "behind");
});
