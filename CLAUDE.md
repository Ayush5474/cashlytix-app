# Cashlytix – working notes

Read [AGENTS.md](AGENTS.md) first (Expo rules). Product decisions are in [docs/SPEC.md](docs/SPEC.md).

## Conventions
- Money is stored as **integer paise**; format with `formatINR` (Indian grouping). Dates are local `YYYY-MM-DD` strings.
- Account balances are **derived** (opening balance + transactions). Never store a running balance.
- Credit cards are liabilities: spending raises what is owed; paying the bill is a transfer. Total balance subtracts them.
- Transfers are excluded from income and expense totals.
- Pure logic lives in `src/domain` and must have vitest coverage. UI lives in `src/ui` and `src/app` (expo-router).
- State: zustand + persist (AsyncStorage) in `src/store`.

## Before finishing a change
`npm run typecheck && npm test` (and `npm run build:web` for UI changes).
