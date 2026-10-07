import assert from "node:assert/strict";
import test from "node:test";
import { calcBMR, calcEnergyProfile, referenceWeightKg } from "./nutrition";
import { buildQuestMap, computeStreak, suggestNext, waterGoalMl, EXERCISES } from "./quest";
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

const heavy: UserSettings = {
  ...s, age: 24, heightCm: 178, weightKg: 125, goalWeightKg: 80, activity: "light", deficitPct: 0.2,
};

test("heavy user: protein sized on adjusted weight, not total weight", () => {
  const p = calcEnergyProfile(heavy, 125);
  assert.equal(p.bmr, 2248);
  assert.equal(p.tdee, 3091);
  assert.ok(p.targets.proteinG < 170 && p.targets.proteinG > 140, String(p.targets.proteinG));
  assert.ok(referenceWeightKg(125, 178) < 100);
});

test("requested deficit is capped by BMI and reported", () => {
  const lean = { ...s, deficitPct: 0.35 };
  const p = calcEnergyProfile(lean, 78); // BMI 24 -> max 15%
  assert.ok(p.deficitKcal <= Math.round(p.tdee * 0.15) + 1);
  assert.ok(p.notes.includes("deficit_capped"));
});

test("intake never drops below floor; no deficit at goal or when underweight", () => {
  const small: UserSettings = { ...s, sex: "female", heightCm: 160, weightKg: 52, goalWeightKg: 50, activity: "sedentary", deficitPct: 0.2 };
  const p = calcEnergyProfile(small, 52);
  assert.ok(p.targets.kcal >= 1200);
  const atGoal = calcEnergyProfile(s, 72);
  assert.equal(atGoal.deficitKcal, 0);
  assert.ok(atGoal.notes.includes("at_goal"));
  const thin = calcEnergyProfile({ ...s, weightKg: 55, goalWeightKg: 50 }, 55); // BMI 17
  assert.equal(thin.deficitKcal, 0);
  assert.ok(thin.notes.includes("underweight"));
});

test("water goal stays in a sensible range", () => {
  assert.equal(waterGoalMl(125), 3500);
  assert.equal(waterGoalMl(40), 1500);
});

test("profile-sourced weight does not count as check-in quest", () => {
  const data = {
    sets: [], meals: [], days: {},
    weights: [{ date: "2026-01-01", weightKg: 80, source: "profile" as const }],
  };
  const nodes = buildQuestMap("2026-01-01", "2026-01-01", data);
  assert.equal(nodes[0].tasksDone.checkin, false);
});
