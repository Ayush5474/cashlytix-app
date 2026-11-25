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

## What works today (v0.1)

- Accounts (checking, saving, investment, cash, wallet, credit card) with derived balances
- Quick Add: Expense / Income / Transfer with a number pad, category and account chips, optional details
- Dashboard: total balance, period filter, income / expenses / net, tap-to-inspect donut, Need · Want · Saved bars, recent list
- Transactions list with search and type filter, tap to edit or delete
- Data is stored on the device (no login yet)

See [docs/SPEC.md](docs/SPEC.md) for the product decisions and [CLAUDE.md](CLAUDE.md) for code conventions.
