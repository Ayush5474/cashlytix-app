import type { SupabaseClient } from '@supabase/supabase-js';

import type { Remote, SyncData } from '@/domain/sync';

/** The user's cloud copy: one row in `user_data` (see docs/supabase.sql). */
export function supabaseRemote(client: SupabaseClient, userId: string): Remote {
  return {
    async fetch() {
      const { data, error } = await client.from('user_data').select('data, rev').eq('user_id', userId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return { data: null, rev: 0 };
      return { data: data.data as SyncData, rev: Number(data.rev) };
    },

    async push(data, expectedRev) {
      if (expectedRev === null) {
        const { error } = await client.from('user_data').insert({ user_id: userId, data, rev: 1 });
        if (!error) return true;
        if (error.code === '23505') return false; // another device created it first
        throw new Error(error.message);
      }
      const { data: rows, error } = await client
        .from('user_data')
        .update({ data, rev: expectedRev + 1, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('rev', expectedRev)
        .select('rev');
      if (error) throw new Error(error.message);
      return (rows?.length ?? 0) === 1;
    },
  };
}
