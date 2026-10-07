import { sumMacros } from "./nutrition";
import { EXERCISES, WEIGHT_STEP_KG } from "./quest";
import { translate } from "./i18n";
import type { CoachContext, CoachId, Lang, SetTag } from "./types";

export const COACH_IDS: CoachId[] = ["fitness_coach", "daily_motivator", "nutrition_advisor"];

const ROLE: Record<CoachId, string> = {
  fitness_coach:
    "You are fitness_coach, a strength coach. Use the user's set log, notes and quick tags (#TooLight, #TooHeavy, #FormStuck) to give concrete progression, deload or technique advice. Progression step is +2.5 kg.",
  daily_motivator:
    "You are daily_motivator, an upbeat but honest accountability coach. Reference the streak, day number, rest-day status and trend status. Keep it short and energising.",
  nutrition_advisor:
    "You are nutrition_advisor, a practical sports dietitian. Use BMR, TDEE, targets, what has been eaten and what remains to suggest specific foods that close the remaining calorie/protein gap.",
};

export function buildSystemPrompt(coach: CoachId, ctx: CoachContext): string {
  const language = ctx.lang === "zh-TW" ? "Traditional Chinese (繁體中文)" : "English";
  return [
    ROLE[coach],
    `ALWAYS reply in ${language}. Keep replies under 120 words. No medical diagnosis.`,
    "Live user context (JSON, source of truth - never invent numbers):",
    JSON.stringify(ctx),
  ].join("\n\n");
}

/** Rule-based replies so the coaches work with no API key and no network. */
export function localCoachReply(coach: CoachId, ctx: CoachContext): string {
  const t = (k: Parameters<typeof translate>[1]) => translate(ctx.lang, k);
  const zh = ctx.lang === "zh-TW";
  const lines: string[] = [];

  if (coach === "fitness_coach") {
    const heavy = ctx.tagCounts.too_heavy;
    const light = ctx.tagCounts.too_light;
    const form = ctx.tagCounts.form_stuck;
    if (ctx.isRestDay) lines.push(zh ? "今天是休息日：好好恢復，睡足、補水、散步即可。" : "Rest day: recover, sleep, hydrate, easy walk.");
    else if (ctx.todaySets.length === 0) lines.push(zh ? "今天還沒有紀錄組數，先從熱身組開始，點一下就能記錄。" : "No sets logged yet. Start with a warm-up set; one tap logs it.");
    if (light > 0) lines.push(zh ? `你標了 ${light} 次 #太輕：下次這些動作加 ${WEIGHT_STEP_KG} 公斤。` : `You tagged #TooLight ${light}×: add ${WEIGHT_STEP_KG} kg next time.`);
    if (heavy > 0) lines.push(zh ? `${heavy} 次 #太重：減 ${WEIGHT_STEP_KG} 公斤並把次數做完整。` : `${heavy}× #TooHeavy: drop ${WEIGHT_STEP_KG} kg and own every rep.`);
    if (form > 0) lines.push(zh ? "姿勢卡關：維持重量，放慢離心並錄影檢查，穩了再加重。" : "Form stuck: keep the weight, slow the lowering phase, film a set and fix it before adding load.");
    const noted = ctx.todaySets.find((s) => s.note);
    if (noted?.note) lines.push(zh ? `我看到你的筆記：「${noted.note}」。` : `Noted your comment: "${noted.note}".`);
    if (lines.length === 0) lines.push(zh ? "進度穩定，維持目前重量，次數到達上限再加重。" : "Steady work. Hold the weight and add load once you hit the top of your rep range.");
  } else if (coach === "daily_motivator") {
    lines.push(zh ? `第 ${ctx.dayNumber} 天，🔥 連勝 ${ctx.streak} 天！` : `Day ${ctx.dayNumber}, 🔥 ${ctx.streak}-day streak!`);
    if (ctx.trendStatus === "ahead") lines.push(zh ? "體重進度領先預期，保持節奏，別過度節食。" : "You're ahead of plan. Keep the pace, don't over-restrict.");
    else if (ctx.trendStatus === "behind") lines.push(zh ? "略落後預期——不用慌，檢查飲食紀錄與睡眠，小調整就能追上。" : "Slightly behind plan - no panic. Check logging accuracy and sleep; small tweaks catch you up.");
    else if (ctx.trendStatus === "on_track") lines.push(zh ? "完全符合預期，繼續這樣做。" : "Right on track. Keep doing exactly this.");
    lines.push(ctx.isRestDay ? (zh ? "休息日也算數，連勝安全。" : "Rest days count - your streak is safe.") : (zh ? "完成今天兩個任務就能保住連勝。" : "Finish any two quests today to protect your streak."));
  } else {
    lines.push(zh ? `BMR ${ctx.bmr}、TDEE ${ctx.tdee}，今日目標 ${ctx.targets.kcal} ${t("kcal")}。` : `BMR ${ctx.bmr}, TDEE ${ctx.tdee}, today's target ${ctx.targets.kcal} kcal.`);
    lines.push(zh ? `剩餘 ${ctx.remainingKcal} 大卡、蛋白質還差 ${Math.max(0, ctx.remainingProteinG)} g。` : `Remaining ${ctx.remainingKcal} kcal, protein gap ${Math.max(0, ctx.remainingProteinG)} g.`);
    if (ctx.remainingProteinG > 20) lines.push(zh ? "建議補一份高蛋白：雞胸、希臘優格或乳清。" : "Add a high-protein item: chicken breast, Greek yogurt or whey.");
    if (ctx.remainingKcal < 0) lines.push(zh ? "已超出目標，下一餐以蔬菜與蛋白質為主即可，不需要補償性節食。" : "Over target - next meal veg + protein, no compensatory fasting.");
  }
  return lines.join(" ");
}

export function emptyTagCounts(): Record<SetTag, number> {
  return { too_light: 0, too_heavy: 0, form_stuck: 0 };
}

export function buildCoachContext(args: {
  lang: Lang;
  bmr: number;
  tdee: number;
  targets: CoachContext["targets"];
  meals: Array<{ kcal: number; proteinG: number; carbG: number; fatG: number }>;
  todaySets: Array<{ exerciseId: string; weightKg: number; reps: number; tags: SetTag[]; note?: string }>;
  streak: number;
  dayNumber: number;
  isRestDay: boolean;
  trendStatus: CoachContext["trendStatus"];
  weightKg: number;
  goalWeightKg: number;
}): CoachContext {
  const consumed = sumMacros(args.meals);
  const tagCounts = emptyTagCounts();
  for (const s of args.todaySets) for (const tag of s.tags) tagCounts[tag] += 1;
  return {
    lang: args.lang,
    bmr: args.bmr,
    tdee: args.tdee,
    targets: args.targets,
    consumed,
    remainingKcal: args.targets.kcal - consumed.kcal,
    remainingProteinG: args.targets.proteinG - consumed.proteinG,
    streak: args.streak,
    dayNumber: args.dayNumber,
    isRestDay: args.isRestDay,
    trendStatus: args.trendStatus,
    weightKg: args.weightKg,
    goalWeightKg: args.goalWeightKg,
    todaySets: args.todaySets.map((s) => ({
      exercise: EXERCISES.find((e) => e.id === s.exerciseId)?.id ?? s.exerciseId,
      weightKg: s.weightKg,
      reps: s.reps,
      tags: s.tags,
      note: s.note,
    })),
    tagCounts,
  };
}
