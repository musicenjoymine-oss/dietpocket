"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { statusLabel, translate, type DictKey } from "@/lib/i18n";
import type { TrendPoint } from "@/lib/analytics";
import type { Lang, TrendStatus } from "@/lib/types";

const BADGE: Record<TrendStatus, string> = {
  ahead: "bg-emerald-400 text-ink-900",
  on_track: "bg-sky-400 text-ink-900",
  behind: "bg-orange-400 text-ink-900",
  no_data: "bg-ink-600 text-slate-300",
};

interface Props { lang: Lang; points: TrendPoint[]; status: TrendStatus; deltaKg: number; today: string }

export function TrendChart({ lang, points, status, deltaKg }: Props) {
  const t = (k: DictKey) => translate(lang, k);
  const hasActual = points.filter((p) => p.actual !== null).length >= 2;
  const values = points.flatMap((p) => [p.expected, p.actual ?? p.expected]);
  const min = Math.floor(Math.min(...values) - 0.5);
  const max = Math.ceil(Math.max(...values) + 0.5);
  const data = points.map((p, i) => ({ ...p, label: String(i + 1) }));

  return (
    <section className="card">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-bold">{t("trendTitle")}</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${BADGE[status]}`}>
          {statusLabel(lang, status)}
          {status !== "no_data" && ` (${deltaKg > 0 ? "+" : ""}${deltaKg} kg)`}
        </span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
            <CartesianGrid stroke="#263140" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
            <YAxis domain={[min, max]} stroke="#64748b" fontSize={11} />
            <Tooltip contentStyle={{ background: "#121820", border: "1px solid #263140", borderRadius: 12 }} />
            <Legend />
            <Line name={t("expected")} dataKey="expected" stroke="#94a3b8" strokeDasharray="6 4" dot={false} />
            <Line name={t("actual")} dataKey="actual" stroke="#c6ff3d" strokeWidth={3} connectNulls dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {!hasActual && <p className="mt-2 text-xs text-slate-400">{t("needData")}</p>}
    </section>
  );
}
