"use client";

import { motion } from "framer-motion";
import { Moon, X } from "lucide-react";
import { translate, type DictKey } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import type { useGame } from "@/lib/useGame";
import type { UserSettings } from "@/lib/types";
import { CheckinTask } from "./CheckinTask";
import { MealLogger } from "./MealLogger";
import { WorkoutLogger } from "./WorkoutLogger";

type Game = ReturnType<typeof useGame>;

/** Single flat sheet: all three quests are visible at once, no nested steps. */
export function DailyQuestModal({ settings, game, onClose }: { settings: UserSettings; game: Game; onClose: () => void }) {
  const t = (k: DictKey) => translate(settings.lang, k);
  const setRest = useAppStore((s) => s.setRest);
  const { today, isRestDay } = game;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}
        className="max-h-[92vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-ink-900 p-4 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-volt">
            {settings.lang === "zh-TW" ? `${t("day")} ${game.dayNo} 天` : `${t("day")} ${game.dayNo}`}
          </h2>
          <button aria-label={t("close")} className="btn-ghost !p-2" onClick={onClose}><X size={18} /></button>
        </div>

        <label className="card flex cursor-pointer items-center gap-3">
          <Moon className="text-sky-300" />
          <span className="flex-1">
            <b className="block">{t("restToggle")}</b>
            <span className="text-xs text-slate-400">{t("restHint")}</span>
          </span>
          <input type="checkbox" className="h-5 w-5 accent-lime-300" checked={isRestDay}
            onChange={(e) => setRest(today, e.target.checked)} />
        </label>

        {!isRestDay && <WorkoutLogger lang={settings.lang} date={today} />}
        <MealLogger lang={settings.lang} date={today} meals={game.todayMeals} targets={game.energy.targets} consumed={game.consumed} />
        <CheckinTask lang={settings.lang} date={today} currentKg={game.currentKg} />
      </motion.div>
    </div>
  );
}
