# Molbhav.AI

AI-powered collective procurement for neighbourhood commerce.

## Imported and recovered scope

The original import contained only the starter homepage and was preserved as
the Vite artifact. The actual backend was subsequently recovered separately
from `feat/raman-core`; it is Next.js and must not be converted to Vite.
The existing Molbhav Supabase project is now connected and the three recovered
migrations applied. Live P0 checks use explicitly labelled TEST actors, never
claimed as external users, LIVE transactions, or real-human consent.

## Run & Operate

- Start the managed workflow `artifacts/molbhav: web` for the recovered Next.js app.
- The original Vite source is preserved in `artifacts/molbhav/`; the managed
  service now runs `recovered/molbhav-next/` without converting its framework.
- In `recovered/molbhav-next/`, use `npm run build`, `npm run lint`, and `npm test`.
- Required cloud settings are the existing Molbhav Supabase URL and publishable
  key. Server-only administration/migration credentials must stay in Secrets.
- No cloud project or database may be replaced or reset.
- The recovered source's submission evidence is in `docs/SUBMISSION_STATUS.md`
  within that directory; a runnable preview is not proof of a live database flow.
- The recovered branch Git metadata is stored separately from its tracked source;
  source releases must go to `feat/raman-core`, never main.
- Legacy Vite checks remain available:
- `pnpm --filter @workspace/molbhav run typecheck` checks the frontend.
- `pnpm --filter @workspace/molbhav test` runs homepage parity tests.
- Artifact workflows provide `PORT` and `BASE_PATH`; there is intentionally no root dev command.
- The legacy Vite homepage needs no secrets or database.

## Stack and layout

- pnpm workspace with React, Vite, TypeScript, and Tailwind CSS v4.
- `artifacts/molbhav/` contains the migrated frontend.
- `.migration-backup/` preserves the original imported source, including the unused Supabase configuration.
- `artifacts/api-server/`, `artifacts/mockup-sandbox/`, and `lib/` are pre-existing workspace scaffolds, not implemented product features.

## Migration constraints

- Preserve the imported UI, copy, links, assets, responsive behavior, and system dark mode; this is not a redesign.
- Supabase is mentioned in the original project documentation. No database was migrated or replaced.
- The original Vercel and Next.js logos and external links are intentional page content, not runtime dependencies.
- For the recovered backend release, preserve Next.js and the existing Supabase
  project. Do not apply the earlier Vite-port instructions to that source.
