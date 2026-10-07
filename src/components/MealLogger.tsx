"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { FOOD_PRESETS } from "@/lib/foods";
import { translate, type DictKey } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import type { Lang, MacroTargets, MealLog } from "@/lib/types";

interface Props { lang: Lang; date: string; meals: MealLog[]; targets: MacroTargets; consumed: MacroTargets }

export function MealLogger({ lang, date, meals, targets, consumed }: Props) {
  const t = (k: DictKey) => translate(lang, k);
  const addMeal = useAppStore((s) => s.addMeal);
  const removeMeal = useAppStore((s) => s.removeMeal);
  const [form, setForm] = useState({ name: "", kcal: "", proteinG: "", carbG: "", fatG: "" });
  const n = (v: string) => Math.max(0, Number(v) || 0);
  const canAdd = form.name.trim() !== "" && n(form.kcal) > 0;

  return (
    <section className="card space-y-3">
      <h3 className="font-bold">{t("questB")}</h3>
      <div className="grid grid-cols-2 gap-2 text-center text-sm">
        <div className="rounded-xl bg-ink-700 p-2">
          <div className="text-xs text-slate-400">{t("remaining")} {t("kcal")}</div>
          <b className="text-lg text-volt">{targets.kcal - Math.round(consumed.kcal)}</b>
        </div>
        <div className="rounded-xl bg-ink-700 p-2">
          <div className="text-xs text-slate-400">{t("protein")}</div>
          <b className="text-lg">{Math.round(consumed.proteinG)} / {targets.proteinG} g</b>
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-slate-400">{t("quickAdd")}</div>
        <div className="flex flex-wrap gap-1.5">
          {FOOD_PRESETS.map((p) => (
            <button key={p.nameKey} className="btn-ghost !px-3 !py-1.5 text-xs"
              onClick={() => addMeal({ date, name: t(p.nameKey), kcal: p.kcal, proteinG: p.proteinG, carbG: p.carbG, fatG: p.fatG })}>
              {t(p.nameKey)}
            </button>
          ))}
        </div>
      </div>

      <details className="rounded-xl bg-ink-700 p-2">
        <summary className="cursor-pointer text-sm">{t("customMeal")}</summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input className="input col-span-2" placeholder={t("mealName")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {(["kcal", "proteinG", "carbG", "fatG"] as const).map((k) => (
            <input key={k} className="input" type="number" inputMode="decimal" min={0}
              placeholder={k === "kcal" ? t("kcal") : `${t(k === "proteinG" ? "protein" : k === "carbG" ? "carbs" : "fat")} (g)`}
              value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          ))}
          <button className="btn-primary col-span-2" disabled={!canAdd} onClick={() => {
            addMeal({ date, name: form.name.trim(), kcal: n(form.kcal), proteinG: n(form.proteinG), carbG: n(form.carbG), fatG: n(form.fatG) });
            setForm({ name: "", kcal: "", proteinG: "", carbG: "", fatG: "" });
          }}>{t("add")}</button>
        </div>
      </details>

      <ul className="space-y-1">
        {meals.map((m) => (
          <li key={m.id} className="flex items-center justify-between rounded-lg bg-ink-700 px-3 py-1.5 text-sm">
            <span>{m.name} · {m.kcal} {t("kcal")} · P{m.proteinG}</span>
            <button aria-label={t("undo")} className="text-slate-400" onClick={() => removeMeal(m.id)}><Trash2 size={15} /></button>
          </li>
        ))}
      </ul>
    </section>
  );
}
