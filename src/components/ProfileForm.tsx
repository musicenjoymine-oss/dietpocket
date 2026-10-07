"use client";

import { useState } from "react";
import { todayISO } from "@/lib/dates";
import { activityLabel, translate } from "@/lib/i18n";
import { calcEnergyProfile, ACTIVITY_FACTORS } from "@/lib/nutrition";
import { useAppStore } from "@/lib/store";
import type { ActivityLevel, Lang, UserSettings } from "@/lib/types";

const BLANK: UserSettings = {
  lang: "zh-TW", age: 30, sex: "male", heightCm: 172, weightKg: 75, goalWeightKg: 68,
  activity: "moderate", deficitPct: 0.2, programStart: todayISO(),
};

export function ProfileForm({ initial, onDone }: { initial?: UserSettings; onDone: () => void }) {
  const saveSettings = useAppStore((s) => s.saveSettings);
  const [f, setF] = useState<UserSettings>(initial ?? BLANK);
  const t = (k: Parameters<typeof translate>[1]) => translate(f.lang, k);
  const num = (k: keyof UserSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: Number(e.target.value) });
  const valid = f.age >= 14 && f.age <= 90 && f.heightCm >= 120 && f.heightCm <= 230 &&
    f.weightKg >= 35 && f.weightKg <= 250 && f.goalWeightKg >= 35 && f.deficitPct >= 0.05 && f.deficitPct <= 0.35;
  const preview = valid ? calcEnergyProfile(f, f.weightKg) : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink-900/95">
      <div className="mx-auto max-w-md space-y-4 p-4">
        <h1 className="text-2xl font-extrabold text-volt">⚡ {initial ? t("profile") : t("onboardingTitle")}</h1>
        <div className="flex gap-2">
          {(["zh-TW", "en"] as Lang[]).map((l) => (
            <button key={l} onClick={() => setF({ ...f, lang: l })}
              className={f.lang === l ? "btn-primary flex-1" : "btn-ghost flex-1"}>
              {l === "zh-TW" ? "繁體中文" : "English"}
            </button>
          ))}
        </div>
        <div className="card grid grid-cols-2 gap-3">
          <label className="text-sm">{t("age")}<input className="input" type="number" value={f.age} onChange={num("age")} /></label>
          <label className="text-sm">{t("sex")}
            <select className="input" value={f.sex} onChange={(e) => setF({ ...f, sex: e.target.value as UserSettings["sex"] })}>
              <option value="male">{t("male")}</option><option value="female">{t("female")}</option>
            </select>
          </label>
          <label className="text-sm">{t("height")}<input className="input" type="number" value={f.heightCm} onChange={num("heightCm")} /></label>
          <label className="text-sm">{t("weight")}<input className="input" type="number" step="0.1" value={f.weightKg} onChange={num("weightKg")} /></label>
          <label className="col-span-2 text-sm">{t("goalWeight")}<input className="input" type="number" step="0.1" value={f.goalWeightKg} onChange={num("goalWeightKg")} /></label>
          <label className="col-span-2 text-sm">{t("activity")}
            <select className="input" value={f.activity} onChange={(e) => setF({ ...f, activity: e.target.value as ActivityLevel })}>
              {(Object.keys(ACTIVITY_FACTORS) as ActivityLevel[]).map((a) => (
                <option key={a} value={a}>{activityLabel(f.lang, a)}</option>
              ))}
            </select>
          </label>
          <label className="col-span-2 text-sm">{t("deficit")}: {Math.round(f.deficitPct * 100)}%
            <input className="w-full accent-lime-300" type="range" min={5} max={35} step={1}
              value={Math.round(f.deficitPct * 100)} onChange={(e) => setF({ ...f, deficitPct: Number(e.target.value) / 100 })} />
          </label>
        </div>
        {preview && (
          <div className="card grid grid-cols-3 gap-2 text-center text-sm">
            <div><div className="text-slate-400">{t("bmr")}</div><b>{preview.bmr}</b></div>
            <div><div className="text-slate-400">{t("tdee")}</div><b>{preview.tdee}</b></div>
            <div><div className="text-slate-400">{t("dailyTarget")}</div><b className="text-volt">{preview.targets.kcal}</b></div>
            <div><div className="text-slate-400">{t("protein")}</div><b>{preview.targets.proteinG}g</b></div>
            <div><div className="text-slate-400">{t("carbs")}</div><b>{preview.targets.carbG}g</b></div>
            <div><div className="text-slate-400">{t("fat")}</div><b>{preview.targets.fatG}g</b></div>
          </div>
        )}
        <div className="flex gap-2">
          {initial && <button className="btn-ghost flex-1" onClick={onDone}>{t("close")}</button>}
          <button className="btn-primary flex-1" disabled={!valid}
            onClick={() => { saveSettings(f); onDone(); }}>
            {initial ? t("save") : t("startQuest")}
          </button>
        </div>
      </div>
    </div>
  );
}
