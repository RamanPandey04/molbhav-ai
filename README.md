# Molbhav.AI

AI powered collective procurement for neighbourhood commerce.

This repository uses Next.js App Router, TypeScript, Tailwind CSS, and Supabase PostgreSQL. `main` is the integration branch. Backend work is on `feat/raman-core`; UI and agent work have separate branches.

Copy `.env.example` to `.env.local` and configure a dedicated Molbhav Supabase project before testing live database requests. The publishable key is safe for client use; never commit a secret or service role key. See `docs/BACKEND_HANDOFF.md` on the backend branch for API contracts and migration status.

Commands: `npm install`, `npm run dev`, `npm run lint`, `npm run build`, and `npm test`.
