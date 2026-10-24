# Molbhav.AI

AI-powered collective procurement for neighbourhood commerce.

## Imported scope

The imported branch contains only the Create Next App starter homepage at `/`.
Its README mentions backend work on another branch, but that implementation is
not present in this import. Do not invent procurement, auth, or database flows
as part of the port.

## Run & Operate

- Start the managed workflow `artifacts/molbhav: web` for the web app.
- `pnpm --filter @workspace/molbhav run typecheck` checks the frontend.
- `pnpm --filter @workspace/molbhav test` runs homepage parity tests.
- Artifact workflows provide `PORT` and `BASE_PATH`; there is intentionally no root dev command.
- The current homepage needs no secrets or database.

## Stack and layout

- pnpm workspace with React, Vite, TypeScript, and Tailwind CSS v4.
- `artifacts/molbhav/` contains the migrated frontend.
- `.migration-backup/` preserves the original imported source, including the unused Supabase configuration.
- `artifacts/api-server/`, `artifacts/mockup-sandbox/`, and `lib/` are pre-existing workspace scaffolds, not implemented product features.

## Migration constraints

- Preserve the imported UI, copy, links, assets, responsive behavior, and system dark mode; this is not a redesign.
- Supabase is mentioned in the original project documentation. No database was migrated or replaced.
- The original Vercel and Next.js logos and external links are intentional page content, not runtime dependencies.
