"use client";

import { Check, Lock, Moon, Play, X } from "lucide-react";
import { translate, type DictKey } from "@/lib/i18n";
import type { Lang, QuestNode } from "@/lib/types";

const OFFSETS = [0, 36, 56, 36, 0, -36, -56, -36]; // gentle sine-like zigzag in px

function NodeIcon({ state }: { state: QuestNode["state"] }) {
  if (state === "completed") return <Check />;
  if (state === "rest") return <Moon />;
  if (state === "missed") return <X />;
  if (state === "today") return <Play />;
  return <Lock size={18} />;
}

const STYLE: Record<QuestNode["state"], string> = {
  completed: "bg-volt text-ink-900",
  rest: "bg-sky-400 text-ink-900",
  today: "bg-volt text-ink-900 shadow-glow",
  missed: "bg-ink-600 text-slate-400",
  locked: "bg-ink-700 text-slate-600",
};

export function QuestMap({ lang, nodes, onOpenToday }: { lang: Lang; nodes: QuestNode[]; onOpenToday: () => void }) {
  const t = (k: DictKey) => translate(lang, k);
  // Nodes are date-ordered, so the last unlocked node is today (or Day 28 once the run is over).
  const entry = [...nodes].reverse().find((n) => n.state !== "locked");

  return (
    <section className="card">
      <h2 className="mb-3 font-bold">{t("questMap")}</h2>
      <ol className="flex flex-col items-center gap-3">
        {nodes.map((n, i) => {
          const isEntry = entry?.day === n.day;
          return (
            <li key={n.day} style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}px)` }}
              className="flex flex-col items-center">
              <button
                disabled={!isEntry}
                onClick={onOpenToday}
                aria-label={`${t("day")} ${n.day}`}
                className={`flex h-14 w-14 items-center justify-center rounded-full border-4 border-ink-900 ${STYLE[n.state]} ${isEntry && n.state === "today" ? "animate-pulse" : ""}`}
              >
                <NodeIcon state={n.state} />
              </button>
              <span className="mt-1 text-[11px] text-slate-400">
                {lang === "zh-TW" ? `${t("day")} ${n.day} 天` : `${t("day")} ${n.day}`}
              </span>
              {isEntry && (
                <button className="btn-primary mt-2 !py-1.5 text-sm" onClick={onOpenToday}>
                  {n.state === "today" ? t("startToday") : n.state === "rest" ? t("restDayLabel") : t("continueToday")}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
