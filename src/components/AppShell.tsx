"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { startSync } from "@/lib/sync";
import { useHydrated } from "@/lib/useGame";
import { Dashboard } from "./Dashboard";
import { ProfileForm } from "./ProfileForm";

export function AppShell() {
  const hydrated = useHydrated();
  const settings = useAppStore((s) => s.settings);
  const [editing, setEditing] = useState(false);

  // Start cloud sync only after the local cache is loaded, so it cannot be overwritten by empty state.
  useEffect(() => (hydrated ? startSync() : undefined), [hydrated]);

  if (!hydrated) return <div className="min-h-screen" />;
  if (!settings) return <ProfileForm onDone={() => setEditing(false)} />;
  return (
    <>
      <Dashboard settings={settings} onEditProfile={() => setEditing(true)} />
      {editing && <ProfileForm initial={settings} onDone={() => setEditing(false)} />}
    </>
  );
}
