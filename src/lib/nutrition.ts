import type { ActivityLevel, EnergyProfile, MacroTargets, Sex, UserSettings, WeightLog } from "./types";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const KCAL_PER_KG_FAT = 7700;
const PROTEIN_G_PER_KG = 2.0;
const FAT_KCAL_FRACTION = 0.25;
/** Safety floor so an aggressive deficit never drops below a sane intake. */
const MIN_KCAL: Record<Sex, number> = { male: 1500, female: 1200 };

/** Mifflin-St Jeor resting energy expenditure (kcal/day). */
export function calcBMR(p: { sex: Sex; weightKg: number; heightCm: number; age: number }): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return Math.round(base + (p.sex === "male" ? 5 : -161));
}

export function calcTDEE(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activity]);
}

/** Build the macro split for a given calorie target and body weight. */
export function calcMacros(kcal: number, weightKg: number): MacroTargets {
  const proteinG = Math.round(weightKg * PROTEIN_G_PER_KG);
  const fatG = Math.round((kcal * FAT_KCAL_FRACTION) / 9);
  const carbKcal = Math.max(0, kcal - proteinG * 4 - fatG * 9);
  return { kcal, proteinG, fatG, carbG: Math.round(carbKcal / 4) };
}

/**
 * Full energy profile for a weight. Pass the smoothed weight so targets glide
 * rather than jump when a single weigh-in is noisy.
 */
export function calcEnergyProfile(s: UserSettings, weightKg: number): EnergyProfile {
  const bmr = calcBMR({ sex: s.sex, weightKg, heightCm: s.heightCm, age: s.age });
  const tdee = calcTDEE(bmr, s.activity);
  const kcal = Math.max(MIN_KCAL[s.sex], Math.round(tdee * (1 - s.deficitPct)));
  return {
    bmr,
    tdee,
    deficitKcal: Math.max(0, tdee - kcal),
    targets: calcMacros(kcal, weightKg),
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
