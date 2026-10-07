"use client";

import { useEffect, useMemo, useState } from "react";
import { buildTrend, trendStatus } from "./analytics";
import { buildCoachContext } from "./coach";
import { todayISO } from "./dates";
import { translate, type DictKey } from "./i18n";
import { calcEnergyProfile, smoothedWeight, sumMacros } from "./nutrition";
import { buildQuestMap, computeStats, computeStreak, dayNumber, QUEST_LENGTH } from "./quest";
import { useAppStore } from "./store";
import type { UserSettings } from "./types";

export function useHydrated(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    void Promise.resolve(useAppStore.persist.rehydrate()).then(() => setOk(true));
  }, []);
  return ok;
}

/** Everything the UI shows, derived from raw logs. Nothing here is stored. */
export function useGame(settings: UserSettings) {
  const { sets, meals, weights, days } = useAppStore();
  const today = todayISO();

  return useMemo(() => {
    const data = { sets, meals, weights, days };
    const basisKg = smoothedWeight(weights, settings.weightKg, today);
    const energy = calcEnergyProfile(settings, basisKg);
    const nodes = buildQuestMap(settings.programStart, today, data);
    const { streak, freezesLeft } = computeStreak(nodes);
    const stats = computeStats(nodes, data, streak, energy.targets, basisKg);
    const trend = buildTrend(settings, weights, today);
    const { status, deltaKg } = trendStatus(trend, today);
    const dayNo = dayNumber(settings.programStart, today);
    const todayMeals = meals.filter((m) => m.date === today);
    const todaySets = sets.filter((s) => s.date === today);
    const isRestDay = days[today]?.isRest ?? false;
    const consumed = sumMacros(todayMeals);
    const currentKg = weights.length ? weights[weights.length - 1].weightKg : settings.weightKg;
    const coachContext = buildCoachContext({
      lang: settings.lang,
      bmr: energy.bmr,
      tdee: energy.tdee,
      targets: energy.targets,
      meals: todayMeals,
      todaySets,
      bmi: energy.bmi,
      healthNotes: energy.notes,
      streak,
      dayNumber: dayNo,
      isRestDay,
      trendStatus: status,
      weightKg: currentKg,
      goalWeightKg: settings.goalWeightKg,
    });
    return {
      today, energy, nodes, streak, freezesLeft, stats, trend, status, deltaKg,
      dayNo, programDone: dayNo > QUEST_LENGTH, todayMeals, todaySets, isRestDay,
      consumed, currentKg, coachContext, basisKg,
    };
  }, [settings, sets, meals, weights, days, today]);
}

export function useT(lang: UserSettings["lang"]) {
  return (key: DictKey) => translate(lang, key);
}
