# Cloud sync (Supabase)

The app is local-first. When you sign in, each device keeps working offline and merges with one cloud copy.

## How it works
- Every record has an `updatedAt` time; deletes leave a small marker (tombstone) so they reach other devices.
- `src/domain/sync.ts` merges two copies: the newer edit of a record wins, a delete wins unless the record was changed later (for example Undo). The merge is the same on every device, so they always converge.
- The cloud copy is one row per user in `user_data`. A write only succeeds if nobody else wrote since we read (`rev` check); otherwise we re-read, merge and retry.
- Recurring entries get stable ids (`rec_<rule>_<date>`), so two devices never log the same one twice.
- Device settings (theme, Pro preview) are not synced.

## Switch it on
1. Create a free project at supabase.com.
2. SQL Editor: run `docs/supabase.sql`.
3. Authentication → Providers → Email: for testing, turn off "Confirm email".
4. Project Settings → API: copy the **Project URL** and the **anon public** key (never the service_role key).
5. Put them in `src/sync/config.ts` (`FALLBACK`) or set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` at build time.

## Not done yet
- Google sign-in, password reset, phone OTP.
- Pruning old delete markers.
- Real-time updates between open devices (sync runs on change, on return to the app, and via "Sync now").
