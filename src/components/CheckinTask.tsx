"use client";

import { useState } from "react";
import { Droplets } from "lucide-react";
import { translate, type DictKey } from "@/lib/i18n";
import { waterGoalMl } from "@/lib/quest";
import { useAppStore } from "@/lib/store";
import type { Lang } from "@/lib/types";

export function CheckinTask({ lang, date, currentKg }: { lang: Lang; date: string; currentKg: number }) {
  const t = (k: DictKey) => translate(lang, k);
  const logWeight = useAppStore((s) => s.logWeight);
  const addWater = useAppStore((s) => s.addWater);
  const water = useAppStore((s) => s.days[date]?.waterMl ?? 0);
  const todayWeight = useAppStore((s) => s.weights.find((w) => w.date === date)?.weightKg);
  const [kg, setKg] = useState(String(todayWeight ?? currentKg));
  const goal = waterGoalMl(currentKg);
  const valid = Number(kg) >= 30 && Number(kg) <= 300;

  return (
    <section className="card space-y-3">
      <h3 className="font-bold">{t("questC")}</h3>
      <div className="flex gap-2">
        <input className="input" type="number" inputMode="decimal" step="0.1" value={kg} onChange={(e) => setKg(e.target.value)} aria-label={t("weightToday")} />
        <button className="btn-primary whitespace-nowrap" disabled={!valid} onClick={() => logWeight(date, Number(kg))}>
          {todayWeight !== undefined ? "✓ " : ""}{t("logWeight")}
        </button>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs"><span><Droplets className="mr-1 inline" size={14} />{t("water")}</span><span>{water} / {goal} {t("ml")}</span></div>
        <div className="mb-2 h-2 overflow-hidden rounded-full bg-ink-600"><div className="h-full bg-sky-400" style={{ width: `${Math.min(100, (water / goal) * 100)}%` }} /></div>
        <div className="flex gap-2">
          {[250, 500].map((ml) => <button key={ml} className="btn-ghost flex-1" onClick={() => addWater(date, ml)}>+{ml}</button>)}
          <button className="btn-ghost flex-1" onClick={() => addWater(date, -250)}>−250</button>
        </div>
      </div>
    </section>
  );
}
