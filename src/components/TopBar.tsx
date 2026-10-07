"use client";

import { Award, Flame, Snowflake, Zap } from "lucide-react";
import { ALL_BADGES } from "@/lib/quest";
import { translate, type DictKey } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

interface Props {
  lang: Lang; streak: number; xp: number; level: number; levelProgress: number;
  freezes: number; badges: string[];
}

export function TopBar({ lang, streak, xp, level, levelProgress, freezes, badges }: Props) {
  const t = (k: DictKey) => translate(lang, k);
  return (
    <section className="card space-y-3">
      <div className="grid grid-cols-4 gap-2 text-center text-sm">
        <div title={t("streak")}><Flame className="mx-auto text-orange-400" /><b>{streak}</b></div>
        <div title={t("xp")}><Zap className="mx-auto text-volt" /><b>{xp}</b></div>
        <div title={t("freeze")}><Snowflake className="mx-auto text-sky-300" /><b>{freezes}</b></div>
        <div title={t("badges")}><Award className="mx-auto text-amber-300" /><b>{badges.length}/{ALL_BADGES.length}</b></div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-slate-400"><span>{t("level")} {level}</span><span>{xp} {t("xp")}</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-600">
          <div className="h-full bg-volt transition-all" style={{ width: `${levelProgress * 100}%` }} />
        </div>
      </div>
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <span key={b} className="rounded-full bg-ink-700 px-2 py-0.5 text-xs">🏅 {t(`b_${b}` as DictKey)}</span>
          ))}
        </div>
      )}
    </section>
  );
}
