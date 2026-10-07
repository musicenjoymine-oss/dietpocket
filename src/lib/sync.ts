"use client";

import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { emptySyncData, mergeData, type SyncData } from "./merge";
import { useAppStore } from "./store";
import { supabase } from "./supabase";
import * as remote from "./syncRemote";

export type SyncStatus = "off" | "idle" | "syncing" | "error";

interface SyncState {
  status: SyncStatus;
  user: { id: string; email: string } | null;
  authReady: boolean;
  error: string | null;
}

export const useSyncStore = create<SyncState>(() => ({ status: "off", user: null, authReady: false, error: null }));
const setSync = (p: Partial<SyncState>) => useSyncStore.setState(p);

/** True while remote data is being written into the store, so it is not echoed back. */
let applying = false;
let queue: Promise<void> = Promise.resolve();
let pending = 0;

function snapshot(): SyncData {
  const { settings, sets, meals, weights, days } = useAppStore.getState();
  return { settings, sets, meals, weights, days };
}

function apply(d: SyncData, ownerId: string | null) {
  applying = true;
  try {
    useAppStore.getState().applyData(d, ownerId);
  } finally {
    applying = false;
  }
}

/** Run network work one job at a time so writes reach the server in order. */
function enqueue(job: () => Promise<void>) {
  pending += 1;
  useAppStore.getState().setDirty(true);
  setSync({ status: "syncing" });
  queue = queue
    .then(job)
    .then(() => {
      pending -= 1;
      if (pending === 0) {
        useAppStore.getState().setDirty(false);
        setSync({ status: "idle", error: null });
      }
    })
    .catch((e: unknown) => {
      pending -= 1;
      setSync({ status: "error", error: e instanceof Error ? e.message : String(e) });
    });
  return queue;
}

/**
 * Reconcile this device with the account:
 * - data from a different account is discarded, never uploaded;
 * - anonymous local data (or unsent changes) is merged in and uploaded;
 * - otherwise the server copy simply replaces the local cache.
 */
export async function syncNow(): Promise<void> {
  const db = supabase;
  const user = useSyncStore.getState().user;
  if (!db || !user || pending > 0) return;
  setSync({ status: "syncing" });
  try {
    const st = useAppStore.getState();
    const server = await remote.pullAll(db, user.id);
    const keepLocal = st.ownerId === null || (st.ownerId === user.id && st.dirty);
    const merged = keepLocal ? mergeData(snapshot(), server) : server;
    apply(merged, user.id);
    if (keepLocal) await remote.pushAll(db, user.id, merged);
    useAppStore.getState().setDirty(false);
    setSync({ status: "idle", error: null });
  } catch (e) {
    useAppStore.getState().setDirty(true);
    setSync({ status: "error", error: e instanceof Error ? e.message : String(e) });
  }
}

type Keyed<T> = { items: T[]; key: (x: T) => string };
function diff<T>(next: Keyed<T>, prev: Keyed<T>) {
  const before = new Map(prev.items.map((x) => [prev.key(x), x]));
  const after = new Set(next.items.map(next.key));
  return {
    upserts: next.items.filter((x) => before.get(next.key(x)) !== x),
    removedKeys: [...before.keys()].filter((k) => !after.has(k)),
  };
}

/** Push whatever changed between two store states. */
function pushChanges(next: SyncData, prev: SyncData) {
  const db = supabase;
  const user = useSyncStore.getState().user;
  if (!db || !user || applying) return;
  const uid = user.id;

  if (next.settings && next.settings !== prev.settings) {
    const s = next.settings;
    void enqueue(() => remote.upsertSettings(db, uid, s));
  }
  if (next.sets !== prev.sets) {
    const d = diff({ items: next.sets, key: (x) => x.id }, { items: prev.sets, key: (x) => x.id });
    if (d.upserts.length) void enqueue(() => remote.upsertSets(db, uid, d.upserts));
    if (d.removedKeys.length) void enqueue(() => remote.deleteSets(db, uid, d.removedKeys));
  }
  if (next.meals !== prev.meals) {
    const d = diff({ items: next.meals, key: (x) => x.id }, { items: prev.meals, key: (x) => x.id });
    if (d.upserts.length) void enqueue(() => remote.upsertMeals(db, uid, d.upserts));
    if (d.removedKeys.length) void enqueue(() => remote.deleteMeals(db, uid, d.removedKeys));
  }
  if (next.weights !== prev.weights) {
    const d = diff({ items: next.weights, key: (x) => x.date }, { items: prev.weights, key: (x) => x.date });
    if (d.upserts.length) void enqueue(() => remote.upsertWeights(db, uid, d.upserts));
  }
  if (next.days !== prev.days) {
    const d = diff(
      { items: Object.values(next.days), key: (x) => x.date },
      { items: Object.values(prev.days), key: (x) => x.date },
    );
    if (d.upserts.length) void enqueue(() => remote.upsertDays(db, uid, d.upserts));
  }
}

function userFromSession(session: Session | null): SyncState["user"] {
  return session?.user ? { id: session.user.id, email: session.user.email ?? "" } : null;
}

/** Wire auth, change tracking and refresh triggers. Returns a cleanup function. */
export function startSync(): () => void {
  const db = supabase;
  if (!db) return () => undefined;

  const onSession = (session: Session | null) => {
    const user = userFromSession(session);
    const changed = useSyncStore.getState().user?.id !== user?.id;
    setSync({ user, authReady: true, status: user ? "idle" : "off" });
    if (user && changed) void syncNow();
  };

  void db.auth.getSession().then(({ data }) => onSession(data.session));
  const { data: sub } = db.auth.onAuthStateChange((_event, session) => onSession(session));

  const unsubStore = useAppStore.subscribe((next, prev) => pushChanges(next, prev));

  const refresh = () => {
    if (document.visibilityState !== "visible") return;
    const { status } = useSyncStore.getState();
    // After an error, retry (a dirty device merges and re-uploads).
    if (status === "idle" || status === "error") void syncNow();
  };
  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("online", refresh);

  return () => {
    sub.subscription.unsubscribe();
    unsubStore();
    document.removeEventListener("visibilitychange", refresh);
    window.removeEventListener("online", refresh);
  };
}

export async function sendLoginEmail(email: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw new Error(error.message);
}

export async function verifyLoginCode(email: string, token: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw new Error(error.message);
}

/** Flush unsent changes, sign out, and clear this device's copy so accounts never mix. */
export async function signOutAndClear(): Promise<void> {
  if (!supabase) return;
  await queue;
  await supabase.auth.signOut();
  apply(emptySyncData(), null);
  useAppStore.getState().setDirty(false);
}
