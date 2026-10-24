# Molbhav.AI

AI-powered collective procurement for neighbourhood commerce.

## Replit port

The imported branch contains the default starter homepage, not the procurement
backend or product UI described in the original README. That homepage is
preserved as a React + Vite app in `artifacts/molbhav/`.

Use the **artifacts/molbhav: web** workflow to run the app in Replit. Dependencies
are managed with `pnpm install` at the workspace root.

```sh
pnpm --filter @workspace/molbhav run typecheck
pnpm --filter @workspace/molbhav test
```

The workflow supplies `PORT` and `BASE_PATH`. Production publishing builds the
frontend as static files. The current page does not require environment secrets.

## Original source

`.migration-backup/` retains the imported Next.js source and Supabase
configuration for reference. The original README mentions backend work on
`feat/raman-core`; that branch's implementation was not part of this import.
No Supabase database, configuration, or live data has been changed.

The other artifact and library directories are the pre-existing Replit workspace
scaffold. They are available for future development but are not required by this
homepage.
