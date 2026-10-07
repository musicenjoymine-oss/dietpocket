"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { SetTag, Lang } from "@/lib/types";
import { tagLabel, translate, type DictKey } from "@/lib/i18n";
import { EXERCISES, suggestNext, WEIGHT_STEP_KG } from "@/lib/quest";
import { useAppStore } from "@/lib/store";

const TAGS: SetTag[] = ["too_light", "too_heavy", "form_stuck"];

export function WorkoutLogger({ lang, date }: { lang: Lang; date: string }) {
  const t = (k: DictKey) => translate(lang, k);
  const allSets = useAppStore((s) => s.sets);
  const logSet = useAppStore((s) => s.logSet);
  const toggleTag = useAppStore((s) => s.toggleSetTag);
  const removeSet = useAppStore((s) => s.removeSet);

  const [exerciseId, setExerciseId] = useState(EXERCISES[0].id);
  const [override, setOverride] = useState<{ exerciseId: string; weightKg: number; reps: number } | null>(null);
  const [note, setNote] = useState("");

  const exercise = EXERCISES.find((e) => e.id === exerciseId) ?? EXERCISES[0];
  const suggestion = suggestNext(exercise, allSets);
  const cur = override && override.exerciseId === exercise.id ? override : { exerciseId, ...suggestion };
  const todaySets = allSets.filter((s) => s.date === date).sort((a, b) => a.createdAt - b.createdAt);
  const exName = (id: string) => t(`ex_${id}` as DictKey);

  const adjust = (dw: number, dr: number) =>
    setOverride({ exerciseId, weightKg: Math.max(0, cur.weightKg + dw), reps: Math.max(1, cur.reps + dr) });

  return (
    <section className="card space-y-3">
      <h3 className="font-bold">{t("questA")}</h3>
      <div className="flex flex-wrap gap-1.5">
        {EXERCISES.map((e) => (
          <button key={e.id} onClick={() => { setExerciseId(e.id); setOverride(null); }}
            className={`${e.id === exerciseId ? "btn-primary" : "btn-ghost"} !px-3 !py-1.5 text-sm`}>
            {exName(e.id)}
          </button>
        ))}
      </div>

      {suggestion.reason && (
        <p className="rounded-lg bg-volt/10 px-3 py-1.5 text-xs text-volt">
          {suggestion.reason === "too_light" ? t("suggestTooLight")
            : suggestion.reason === "too_heavy" ? t("suggestTooHeavy") : t("suggestForm")}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-xs text-slate-400">{t("kg")}</div>
          <div className="flex items-center justify-between gap-1">
            <button aria-label="-" className="btn-ghost !p-2" onClick={() => adjust(-WEIGHT_STEP_KG, 0)}><Minus size={16} /></button>
            <b className="text-2xl">{cur.weightKg}</b>
            <button aria-label="+" className="btn-ghost !p-2" onClick={() => adjust(WEIGHT_STEP_KG, 0)}><Plus size={16} /></button>
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">{t("reps")}</div>
          <div className="flex items-center justify-between gap-1">
            <button aria-label="-" className="btn-ghost !p-2" onClick={() => adjust(0, -1)}><Minus size={16} /></button>
            <b className="text-2xl">{cur.reps}</b>
            <button aria-label="+" className="btn-ghost !p-2" onClick={() => adjust(0, 1)}><Plus size={16} /></button>
          </div>
        </div>
      </div>

      <input className="input text-sm" value={note} maxLength={120} placeholder={t("note")} onChange={(e) => setNote(e.target.value)} />
      {/* One tap logs a set with the prefilled (adaptive) load. */}
      <button className="btn-primary w-full" onClick={() => {
        logSet({ date, exerciseId, weightKg: cur.weightKg, reps: cur.reps, tags: [], note: note.trim() || undefined });
        setOverride(null);
        setNote("");
      }}>{t("logSet")}</button>

      <ul className="space-y-2">
        {todaySets.length === 0 && <li className="text-xs text-slate-400">{t("noSets")}</li>}
        {todaySets.map((s, i) => (
          <li key={s.id} className="rounded-xl bg-ink-700 p-2 text-sm">
            <div className="flex items-center justify-between">
              <span>#{i + 1} {exName(s.exerciseId)} · {s.weightKg}{t("kg")} × {s.reps}</span>
              <button aria-label={t("undo")} className="text-slate-400" onClick={() => removeSet(s.id)}><Trash2 size={15} /></button>
            </div>
            {s.note && <p className="text-xs text-slate-400">{s.note}</p>}
            <div className="mt-1.5 flex gap-1.5">
              {TAGS.map((tag) => (
                <button key={tag} onClick={() => toggleTag(s.id, tag)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.tags.includes(tag) ? "bg-volt text-ink-900" : "bg-ink-600 text-slate-300"}`}>
                  {tagLabel(lang, tag)}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
