# Cashlytix

Personal-finance app: log every expense in about three taps, see all your money in one place.
One Expo / React Native codebase serves **Android, iOS and the web**.

## Run

```bash
npm install
npm run web        # browser
npm run android    # needs Expo Go or an emulator
npm test           # domain unit tests (vitest)
npm run typecheck
```

## What works today (v0.3)

- **Quick Add** bottom sheet: Expense / Income / Transfer, number pad, category and account chips, optional details; edit, delete and Undo
- **Split bills**: split with friends equally, by amount or by percent; only your share counts as your expense; groups, per-friend balances, Settle up, WhatsApp reminder
- **Home**: balance, period filter, budgets with progress bars, tap-to-inspect donut, Need · Want · Saved, split summary, recent
- **Budgets** (overall and per category), **recurring entries**, **custom categories**
- **Backup**: CSV export, full JSON backup and restore
- Light and dark mode, spring animations, haptics (phones), swipe-to-delete
- Free plan limits with a Pro preview switch (no payments yet)
- **Calendar** view of Activity: spend and entry count per day
- **Cloud sync** (email sign-in, merges edits across devices) — switched on once Supabase keys are added, see docs/SYNC.md
- Data is stored on the device until you sign in

See [docs/SPEC.md](docs/SPEC.md) for the product decisions and [CLAUDE.md](CLAUDE.md) for code conventions.
