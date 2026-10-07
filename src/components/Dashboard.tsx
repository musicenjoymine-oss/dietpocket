"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { translate } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import { useGame } from "@/lib/useGame";
import type { UserSettings } from "@/lib/types";
import { AuthPanel } from "./AuthPanel";
import { CoachPanel } from "./CoachPanel";
import { DailyQuestModal } from "./DailyQuestModal";
import { EnergyCard } from "./EnergyCard";
import { QuestMap } from "./QuestMap";
import { TopBar } from "./TopBar";
import { TrendChart } from "./TrendChart";

export function Dashboard({ settings, onEditProfile }: { settings: UserSettings; onEditProfile: () => void }) {
  const g = useGame(settings);
  const restart = useAppStore((s) => s.restartProgram);
  const [open, setOpen] = useState(false);
  const t = (k: Parameters<typeof translate>[1]) => translate(settings.lang, k);

  return (
    <main className="mx-auto max-w-md space-y-4 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-volt">⚡ {t("appName")}</h1>
        <button aria-label={t("profile")} className="btn-ghost !p-2" onClick={onEditProfile}>
          <Settings size={18} />
        </button>
      </div>
      <TopBar lang={settings.lang} streak={g.streak} xp={g.stats.xp} level={g.stats.level}
        levelProgress={g.stats.levelProgress} freezes={g.freezesLeft} badges={g.stats.badges} />
      <EnergyCard lang={settings.lang} energy={g.energy} consumed={g.consumed} />
      <QuestMap lang={settings.lang} nodes={g.nodes} onOpenToday={() => setOpen(true)} />
      {g.programDone && (
        <div className="card text-center">
          <p className="mb-2 font-bold">{t("programDone")}</p>
          <button className="btn-primary" onClick={restart}>{t("restart")}</button>
        </div>
      )}
      <TrendChart lang={settings.lang} points={g.trend} status={g.status} deltaKg={g.deltaKg} today={g.today} />
      <CoachPanel lang={settings.lang} context={g.coachContext} />
      <AuthPanel lang={settings.lang} />
      {open && <DailyQuestModal settings={settings} game={g} onClose={() => setOpen(false)} />}
    </main>
  );
}
