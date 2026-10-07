"use client";

import { translate, type DictKey } from "@/lib/i18n";
import type { EnergyProfile, Lang, MacroTargets } from "@/lib/types";

function Bar({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs"><span>{label}</span><span>{Math.round(value)} / {target} {unit}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-600"><div className="h-full bg-volt" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function EnergyCard({ lang, energy, consumed }: { lang: Lang; energy: EnergyProfile; consumed: MacroTargets }) {
  const t = (k: DictKey) => translate(lang, k);
  const tg = energy.targets;
  return (
    <section className="card space-y-3">
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div><div className="text-slate-400">{t("bmr")}</div><b className="text-base">{energy.bmr}</b></div>
        <div><div className="text-slate-400">{t("tdee")}</div><b className="text-base">{energy.tdee}</b></div>
        <div><div className="text-slate-400">{t("deficitKcal")}</div><b className="text-base">−{energy.deficitKcal}</b></div>
        <div><div className="text-slate-400">{t("remaining")}</div><b className="text-base text-volt">{tg.kcal - Math.round(consumed.kcal)}</b></div>
      </div>
      <Bar label={t("kcal")} value={consumed.kcal} target={tg.kcal} unit="" />
      <Bar label={t("protein")} value={consumed.proteinG} target={tg.proteinG} unit="g" />
      <Bar label={t("carbs")} value={consumed.carbG} target={tg.carbG} unit="g" />
      <Bar label={t("fat")} value={consumed.fatG} target={tg.fatG} unit="g" />
      <p className="text-[11px] text-slate-500">{t("basis")}: {energy.basisWeightKg} kg</p>
    </section>
  );
}
