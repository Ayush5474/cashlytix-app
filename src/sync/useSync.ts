import type { Session } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { runSync } from '@/domain/sync';
import { selectSyncData, useStore } from '@/store/useStore';

import { getClient } from './client';
import { syncConfigured } from './config';
import { supabaseRemote } from './remote';

interface SyncStatus {
  session: Session | null;
  /** True until the first check for a saved sign-in has finished. */
  loading: boolean;
  state: 'idle' | 'syncing' | 'error';
  lastSyncedAt?: string;
  error?: string;
}

export const useSyncStatus = create<SyncStatus>(() => ({ session: null, loading: syncConfigured, state: 'idle' }));

let running = false;
let again = false;
let applying = false;

/** Merge this device's data with the cloud copy. Safe to call any time; calls never overlap. */
export async function syncNow(): Promise<void> {
  const client = getClient();
  const session = useSyncStatus.getState().session;
  if (!client || !session) return;
  if (running) {
    again = true;
    return;
  }
  running = true;
  useSyncStatus.setState({ state: 'syncing', error: undefined });
  try {
    const outcome = await runSync(selectSyncData(useStore.getState()), supabaseRemote(client, session.user.id));
    if (outcome.changedLocal) {
      applying = true;
      useStore.getState().applyRemote(outcome.merged);
      applying = false;
    }
    useSyncStatus.setState({ state: 'idle', lastSyncedAt: new Date().toISOString() });
  } catch (e) {
    applying = false;
    useSyncStatus.setState({ state: 'error', error: e instanceof Error ? e.message : 'Sync failed' });
  } finally {
    running = false;
    if (again) {
      again = false;
      void syncNow();
    }
  }
}

export const signIn = async (email: string, password: string) => {
  const client = getClient();
  if (!client) return 'Cloud sync is not set up.';
  const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  return error ? error.message : null;
};

/** Returns an error, or null. `needsConfirm` is true when the project requires confirming the email first. */
export const signUp = async (email: string, password: string): Promise<{ error: string | null; needsConfirm: boolean }> => {
  const client = getClient();
  if (!client) return { error: 'Cloud sync is not set up.', needsConfirm: false };
  const { data, error } = await client.auth.signUp({ email: email.trim(), password });
  if (error) return { error: error.message, needsConfirm: false };
  return { error: null, needsConfirm: !data.session };
};

export const signOut = async () => {
  await getClient()?.auth.signOut();
};

/** Mount once at the root: tracks the sign-in and keeps the cloud copy in step. */
export function useSyncManager() {
  useEffect(() => {
    const client = getClient();
    if (!client) return;

    const setSession = (session: Session | null) => {
      const had = useSyncStatus.getState().session?.user.id;
      useSyncStatus.setState({ session, loading: false });
      if (session && session.user.id !== had) void syncNow();
    };

    void client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => setSession(session));

    // Push soon after any local change.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useStore.subscribe((state, prev) => {
      if (applying) return;
      const changed =
        state.accounts !== prev.accounts ||
        state.categories !== prev.categories ||
        state.transactions !== prev.transactions ||
        state.friends !== prev.friends ||
        state.groups !== prev.groups ||
        state.recurring !== prev.recurring ||
        state.monthlyBudget !== prev.monthlyBudget ||
        state.deleted !== prev.deleted;
      if (!changed) return;
      clearTimeout(timer);
      timer = setTimeout(() => void syncNow(), 2500);
    });

    // Pull when the app comes back to the foreground.
    const g = globalThis as any;
    const onVisible = () => {
      if (g.document?.visibilityState === 'visible') void syncNow();
    };
    g.document?.addEventListener?.('visibilitychange', onVisible);
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void syncNow();
    });

    return () => {
      sub.subscription.unsubscribe();
      unsubscribe();
      clearTimeout(timer);
      g.document?.removeEventListener?.('visibilitychange', onVisible);
      appSub.remove();
    };
  }, []);
}
