import type { ActivityLevel, EnergyProfile, HealthNote, MacroTargets, Sex, UserSettings, WeightLog } from "./types";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const KCAL_PER_KG_FAT = 7700;
const FAT_KCAL_FRACTION = 0.25;
const PROTEIN_G_PER_KG_CUT = 1.8;
const PROTEIN_G_PER_KG_MAINTAIN = 1.6;
/** Protein above this share of calories crowds out carbs/fat and is not useful. */
const MAX_PROTEIN_KCAL_FRACTION = 0.35;
/** Absolute intake floors regardless of what the user asks for. */
const MIN_KCAL: Record<Sex, number> = { male: 1500, female: 1200 };
/** Never eat below this share of resting energy expenditure. */
const MIN_BMR_FRACTION = 0.9;
export const UNDERWEIGHT_BMI = 18.5;

export function calcBMI(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function weightAtBMI(bmi: number, heightCm: number): number {
  const m = heightCm / 100;
  return bmi * m * m;
}

/**
 * Weight used for protein sizing. Above BMI 25 only a quarter of the excess
 * counts (adjusted body weight), so heavier people are not told to eat
 * protein for mass they are trying to lose.
 */
export function referenceWeightKg(weightKg: number, heightCm: number): number {
  const w25 = weightAtBMI(25, heightCm);
  return weightKg <= w25 ? weightKg : w25 + 0.25 * (weightKg - w25);
}

/** Largest deficit considered safe to self-direct, by BMI. */
export function maxDeficit(bmi: number): { pct: number; kcal: number } {
  if (bmi < UNDERWEIGHT_BMI) return { pct: 0, kcal: 0 };
  if (bmi < 25) return { pct: 0.15, kcal: 500 };
  if (bmi < 30) return { pct: 0.2, kcal: 750 };
  return { pct: 0.25, kcal: 1000 };
}

/** Mifflin-St Jeor resting energy expenditure (kcal/day). */
export function calcBMR(p: { sex: Sex; weightKg: number; heightCm: number; age: number }): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return Math.round(base + (p.sex === "male" ? 5 : -161));
}

export function calcTDEE(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activity]);
}

/** Macro split: protein from the reference weight, fat 25% of kcal, carbs fill the rest. */
export function calcMacros(kcal: number, refWeightKg: number, cutting: boolean): MacroTargets {
  const perKg = cutting ? PROTEIN_G_PER_KG_CUT : PROTEIN_G_PER_KG_MAINTAIN;
  const proteinG = Math.round(Math.min(refWeightKg * perKg, (kcal * MAX_PROTEIN_KCAL_FRACTION) / 4));
  const fatG = Math.round((kcal * FAT_KCAL_FRACTION) / 9);
  const carbKcal = Math.max(0, kcal - proteinG * 4 - fatG * 9);
  return { kcal, proteinG, fatG, carbG: Math.round(carbKcal / 4) };
}

/**
 * Full energy profile for a weight. Pass the smoothed weight so targets glide
 * rather than jump when a single weigh-in is noisy.
 *
 * Health comes first: the requested deficit is capped by BMI, intake never
 * drops below a floor, and the deficit stops once the goal weight is reached
 * or the user is underweight. Every adjustment is reported in `notes`.
 */
export function calcEnergyProfile(s: UserSettings, weightKg: number): EnergyProfile {
  const bmr = calcBMR({ sex: s.sex, weightKg, heightCm: s.heightCm, age: s.age });
  const tdee = calcTDEE(bmr, s.activity);
  const bmi = calcBMI(weightKg, s.heightCm);
  const notes: HealthNote[] = [];

  if (s.goalWeightKg < weightAtBMI(UNDERWEIGHT_BMI, s.heightCm)) notes.push("goal_too_low");

  const cap = maxDeficit(bmi);
  const atGoal = weightKg <= s.goalWeightKg;
  if (bmi < UNDERWEIGHT_BMI) notes.push("underweight");
  else if (atGoal) notes.push("at_goal");

  const requested = tdee * s.deficitPct;
  const allowed = bmi < UNDERWEIGHT_BMI || atGoal ? 0 : Math.min(requested, tdee * cap.pct, cap.kcal);
  if (allowed < requested - 1 && !atGoal && bmi >= UNDERWEIGHT_BMI) notes.push("deficit_capped");

  let kcal = Math.round(tdee - allowed);
  const floor = Math.min(tdee, Math.max(MIN_KCAL[s.sex], Math.round(bmr * MIN_BMR_FRACTION)));
  if (kcal < floor) {
    kcal = floor;
    notes.push("floor_applied");
  }
  const deficitKcal = Math.max(0, tdee - kcal);

  return {
    bmr,
    tdee,
    bmi,
    deficitKcal,
    weeklyLossKg: Math.round(((deficitKcal * 7) / KCAL_PER_KG_FAT) * 100) / 100,
    notes,
    targets: calcMacros(kcal, referenceWeightKg(weightKg, s.heightCm), deficitKcal > 0),
    basisWeightKg: weightKg,
  };
}

/** Mean of the most recent `window` weigh-ins on/before `date`. */
export function smoothedWeight(logs: WeightLog[], fallbackKg: number, date: string, window = 3): number {
  const recent = logs
    .filter((l) => l.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-window);
  if (recent.length === 0) return fallbackKg;
  const avg = recent.reduce((sum, l) => sum + l.weightKg, 0) / recent.length;
  return Math.round(avg * 10) / 10;
}

export function sumMacros(meals: Array<{ kcal: number; proteinG: number; carbG: number; fatG: number }>): MacroTargets {
  return meals.reduce<MacroTargets>(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      proteinG: acc.proteinG + m.proteinG,
      carbG: acc.carbG + m.carbG,
      fatG: acc.fatG + m.fatG,
    }),
    { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 },
  );
}
