"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useGame";
import { Dashboard } from "./Dashboard";
import { ProfileForm } from "./ProfileForm";

export function AppShell() {
  const hydrated = useHydrated();
  const settings = useAppStore((s) => s.settings);
  const [editing, setEditing] = useState(false);

  if (!hydrated) return <div className="min-h-screen" />;
  if (!settings) return <ProfileForm onDone={() => setEditing(false)} />;
  return (
    <>
      <Dashboard settings={settings} onEditProfile={() => setEditing(true)} />
      {editing && <ProfileForm initial={settings} onDone={() => setEditing(false)} />}
    </>
  );
}
