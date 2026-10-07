"use client";

import { useState } from "react";
import { Cloud, CloudOff } from "lucide-react";
import { translate, type DictKey } from "@/lib/i18n";
import { sendLoginEmail, signOutAndClear, syncNow, useSyncStore, verifyLoginCode } from "@/lib/sync";
import { syncAvailable } from "@/lib/supabase";
import type { Lang } from "@/lib/types";

/** Optional account + sync card. Renders nothing when Supabase is not configured. */
export function AuthPanel({ lang, compact = false }: { lang: Lang; compact?: boolean }) {
  const t = (k: DictKey) => translate(lang, k);
  const { user, status, error, authReady } = useSyncStore();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!syncAvailable || !authReady) return null;

  const run = async (fn: () => Promise<void>, after?: () => void) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      after?.();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <section className="card space-y-2">
        <h2 className="flex items-center gap-2 font-bold"><Cloud size={18} className="text-volt" />{t("syncTitle")}</h2>
        <p className="text-sm">{t("signedInAs")} <b>{user.email}</b></p>
        <p className={`text-xs ${status === "error" ? "text-amber-300" : "text-slate-400"}`}>
          {t(`syncStatus_${status}` as DictKey)}{status === "error" && error ? ` (${error})` : ""}
        </p>
        <div className="flex gap-2">
          <button className="btn-ghost flex-1 text-sm" disabled={status === "syncing"} onClick={() => void syncNow()}>{t("syncNowBtn")}</button>
          <button className="btn-ghost flex-1 text-sm" disabled={busy}
            onClick={() => { if (window.confirm(t("signOutWarn"))) void run(signOutAndClear); }}>{t("signOut")}</button>
        </div>
      </section>
    );
  }

  return (
    <section className="card space-y-2">
      <h2 className="flex items-center gap-2 font-bold"><CloudOff size={18} className="text-slate-400" />{t("syncTitle")}</h2>
      <p className="text-xs text-slate-400">{compact ? t("haveAccount") : t("syncHint")}</p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void run(() => sendLoginEmail(email.trim()), () => setSent(true)); }}>
        <input className="input" type="email" required autoComplete="email" value={email}
          placeholder={t("emailPlaceholder")} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn-primary whitespace-nowrap text-sm" disabled={busy || !email}>{t("sendLink")}</button>
      </form>
      {sent && (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void run(() => verifyLoginCode(email.trim(), code.trim())); }}>
          <p className="text-xs text-volt">{t("linkSent")}</p>
          <div className="flex gap-2">
            <input className="input" inputMode="numeric" autoComplete="one-time-code" value={code}
              placeholder={t("codePlaceholder")} onChange={(e) => setCode(e.target.value)} />
            <button className="btn-ghost whitespace-nowrap text-sm" disabled={busy || !code}>{t("verify")}</button>
          </div>
        </form>
      )}
      {msg && <p className="text-xs text-amber-300">{msg}</p>}
    </section>
  );
}
