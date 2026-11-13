# maxhertlein.com dashboard

Responsive personal start page with editable bookmarks, category filters, search, theme toggle, bookmark import/export and an installable PWA shell.

## Deploy

Cloudflare Pages: connect this repository, use no framework preset, leave the build command blank, and set the build output directory to the repository root. Add `maxhertlein.com` as a custom domain.

## Workout tracker

The phone-first app is at `/workouts/`. It shows the current day's workout only. Strength logging displays target weight and sets × reps, lets you adjust actual reps with +/−, then advances to the next exercise. Run logging shows planned miles and time, accepts actual distance and duration, and calculates pace.

The plan is stored in D1, not hardcoded in the UI. Use Plan → Import CSV to replace the full weekly plan, or export it first. CSV columns:

`day,type,title,exercise,sets,reps,weight,increment,miles,minutes`

One row per activity. Days Monday through Sunday. Types: strength, run, rest. Strength weight and increment are in pounds. Run distance is miles and planned time is minutes. For a loggable recovery activity, use type `rest` with an activity name and planned minutes, for example `Thursday,rest,Recovery,Walk,,,,,,20` or `Thursday,rest,Recovery,Stretching,,,,,,10`. A rest row with an empty exercise cell creates a generic recovery session.

## Connect the D1 database

The repository's `wrangler.toml` is configured with the D1 database ID supplied for this project and the binding name `DB`.

1. In Cloudflare, open **Workers & Pages → your Pages project → Settings → Functions → D1 database bindings**.
2. Add a binding with variable name **DB** and select the existing **maxhertlein-workouts** database. Save. (The same binding is also declared in `wrangler.toml`.)
3. On your computer, install Node.js LTS if you do not already have `node` and `npx`.
4. Open PowerShell in a local clone of this repository, at the folder containing `wrangler.toml`.
5. Run:
   ```powershell
   npx wrangler login
   npx wrangler d1 migrations list maxhertlein-workouts --remote
   npx wrangler d1 migrations apply maxhertlein-workouts --remote
   ```
   Approve the Cloudflare login in your browser. The migration creates the PIN, session, plan, and workout-log tables. The migration file is `migrations/0001_initial.sql`.
6. In Cloudflare Pages, trigger a new deployment from the latest `main` commit (or wait for the Git-triggered deployment to finish).
7. Open `https://maxhertlein.com/workouts/`. The first visit prompts you to create a 6–12 digit PIN. Store it somewhere safe; it cannot be recovered from the database.

If you prefer not to use the Wrangler CLI, open the D1 database's **Console** in Cloudflare and execute the complete SQL in `migrations/0001_initial.sql` once. Do not run both methods; they create the same tables.

## Security

The PIN is salted and hashed server-side using PBKDF2-SHA-256. The browser receives only a Secure, HttpOnly, SameSite=Strict session cookie. Login attempts are throttled by IP. The PIN is not stored in this repository.

## Progression rule

After meeting target reps, the next target weight increases by the exercise's configured increment. One missed target holds weight. Two consecutive missed targets reduce weight by one increment. The plan's baseline is not overwritten. Actual reps are recorded as reps achieved per set across the prescribed sets, not as separate set-by-set entries.

## Current limitations

- The workout API requires the D1 binding and initial migration before it can be used.
- Bookmarks remain in browser localStorage and do not sync across devices.
- The sample plan is illustrative; replace it with your own CSV.
