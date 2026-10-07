import type { DictKey } from "./i18n";

export interface FoodPreset {
  nameKey: DictKey;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

export const FOOD_PRESETS: FoodPreset[] = [
  { nameKey: "f_chicken", kcal: 248, proteinG: 46, carbG: 0, fatG: 5 },
  { nameKey: "f_egg", kcal: 156, proteinG: 13, carbG: 1, fatG: 11 },
  { nameKey: "f_rice", kcal: 280, proteinG: 5, carbG: 62, fatG: 1 },
  { nameKey: "f_whey", kcal: 120, proteinG: 24, carbG: 3, fatG: 2 },
  { nameKey: "f_yogurt", kcal: 130, proteinG: 17, carbG: 6, fatG: 4 },
  { nameKey: "f_oats", kcal: 190, proteinG: 7, carbG: 33, fatG: 4 },
  { nameKey: "f_salmon", kcal: 250, proteinG: 25, carbG: 0, fatG: 16 },
  { nameKey: "f_banana", kcal: 105, proteinG: 1, carbG: 27, fatG: 0 },
];
