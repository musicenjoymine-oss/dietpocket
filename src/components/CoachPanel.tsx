"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { COACH_IDS, localCoachReply } from "@/lib/coach";
import { coachLabel, translate, type DictKey } from "@/lib/i18n";
import type { CoachContext, CoachId, CoachMessage, Lang } from "@/lib/types";

interface ApiReply { reply: string; source: "ai" | "local" }

export function CoachPanel({ lang, context }: { lang: Lang; context: CoachContext }) {
  const t = (k: DictKey) => translate(lang, k);
  const [coach, setCoach] = useState<CoachId>("fitness_coach");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Record<CoachId, CoachMessage[]>>({
    fitness_coach: [], daily_motivator: [], nutrition_advisor: [],
  });
  const [source, setSource] = useState<"ai" | "local" | null>(null);

  async function ask(message: string) {
    setBusy(true);
    setLog((l) => ({ ...l, [coach]: [...l[coach], { role: "user", text: message }] }));
    let reply: ApiReply;
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Always send the latest live context, including the user's current language.
        body: JSON.stringify({ coach, message, context: { ...context, lang } }),
      });
      if (!res.ok) throw new Error(String(res.status));
      reply = (await res.json()) as ApiReply;
    } catch {
      reply = { reply: localCoachReply(coach, context), source: "local" };
    }
    setSource(reply.source);
    setLog((l) => ({ ...l, [coach]: [...l[coach], { role: "coach", text: reply.reply }] }));
    setBusy(false);
  }

  return (
    <section className="card space-y-3">
      <h2 className="font-bold">{t("coach")}</h2>
      <div className="flex gap-1.5">
        {COACH_IDS.map((c) => (
          <button key={c} onClick={() => setCoach(c)}
            className={`${coach === c ? "btn-primary" : "btn-ghost"} flex-1 !px-1 !py-1.5 text-xs`}>
            {coachLabel(lang, c)}
          </button>
        ))}
      </div>
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {log[coach].map((m, i) => (
          <p key={i} className={`rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "ml-8 bg-ink-600" : "mr-8 bg-ink-700"}`}>{m.text}</p>
        ))}
        {busy && <p className="text-sm text-slate-400">{t("thinking")}</p>}
      </div>
      <button className="btn-ghost w-full text-sm" disabled={busy} onClick={() => ask(t("quickAsk"))}>{t("quickAsk")}</button>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim() && !busy) { void ask(text.trim()); setText(""); } }}>
        <input className="input" value={text} maxLength={500} placeholder={t("askPlaceholder")} onChange={(e) => setText(e.target.value)} />
        <button className="btn-primary !px-3" aria-label={t("send")} disabled={busy}><Send size={18} /></button>
      </form>
      {source && <p className="text-[11px] text-slate-500">{source === "ai" ? t("coachAI") : t("coachLocal")}</p>}
    </section>
  );
}
