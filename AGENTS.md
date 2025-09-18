# Repository Guidelines

## Project Structure & Module Organization
Next.js 14 App Router lives in `src/app` with route segments such as `login`, `dashboard`, `bayi-talebi`, and auth flows under `forgot-password`/`reset-password`. Shared UI components stay in `src/components`, and data access is centralized in `src/services/api.ts`. Keep hooks/utilities close to their routes (`src/app/hooks`, `src/app/utils`) and reuse cross-cutting logic via module exports instead of deep relative paths. Static assets land in `public/`, global styling in `src/app/globals.css`, and key config sits at the repo root (`tailwind.config.js`, `eslint.config.mjs`, `tsconfig.json`).

## Build, Test, and Development Commands
Run `npm install` before your first change. Use `npm run dev` to start the local Next server on http://localhost:3000. `npm run build` validates production bundles; pair it with `npm run start` to smoke-test the build. `npm run lint` enforces the Next.js Core Web Vitals ESLint rules. Use `npm run preview` for a Vercel preview deploy and `npm run deploy` for a production push once QA is complete.

## Coding Style & Naming Conventions
Write features in TypeScript with React function components. Favor two-space indentation, `PascalCase` component files, and `camelCase` utilities; co-locate route-level layouts as `layout.tsx`. Tailwind CSS is the default styling layer; compose utility classes rather than inline styles, and extend tokens via `tailwind.config.js` when needed. Obey ESLint diagnostics and address warnings for `@next/next/no-img-element` and hooks dependencies before opening a PR.

## Testing Guidelines
Add or update automated coverage alongside features. Co-locate specs as `*.test.tsx` near the code under test and stub remote calls through `src/services/api.ts`. Until a shared test runner lands, document manual verification steps (flows, browsers, data set) in the PR description and rerun `npm run build` + `npm run start` before merging.

## Commit & Pull Request Guidelines
Keep commit subjects imperative and concise (`Add QR title spacing`). Reference work items such as `PASHA-1002` when relevant and expand context in the body if multiple adjustments ship together. PRs should link the tracking ticket, summarise functional changes, list manual/automated checks, and attach UI screenshots or GIFs for visual updates. Ensure environment variable changes are called out and mirrored in `.env.local` and Vercel project settings.

## Environment & Deployment Notes
Secrets belong in `.env.local`; never commit them. Sync shared defaults via `.env` and document any new keys in `TOKEN_EXPIRY_USAGE.md`. Use `vercel env pull` to refresh cloud values and verify the `vercel.json` redirects when introducing new routes.
