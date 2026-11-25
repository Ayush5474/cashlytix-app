# Cashlytix – product summary

**Problem.** Tracking money is a chore: lengthy forms, scattered accounts, no single view.
**Solution.** A payment-app feel: add an expense in ~3 taps plus an amount; every analysis lives in one place and detail is optional.
**Audience.** Corporate employees, low to high salary. Tracks and manages money; it is not an investing app.

## Core rules
- Transaction types: expense, income, transfer.
- Need / Want / Saved: Saving and Investment count as Saved; other expenses use the entry's Need/Want choice, else the category default.
- Credit cards are liabilities; paying the bill is a transfer.
- Local-first in v1 (no login). Cloud sync and login come later.

## Phasing
1. **v0.1 (this repo now):** accounts, quick add, dashboard, transactions, local storage, web + Android build.
2. Budgets per category, recurring entries, custom categories, CSV export.
3. Login + cloud sync, website parity, reminders, Play Store release.

## Open questions
Login method, Android-only vs iOS at launch, track-only vs advice, free vs premium, website scope.

The full spec (mockups, flowchart, module details) is the shared "Cashlytix Product Spec" document.
