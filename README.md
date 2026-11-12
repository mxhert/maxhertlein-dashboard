# maxhertlein.com dashboard

Responsive personal start page with editable bookmarks, category filters, search, theme toggle, bookmark import/export and an installable PWA shell.

## Deploy
Cloudflare Pages: connect this repository, use no framework preset, leave the build command blank, and set the build output directory to the repository root. Add `maxhertlein.com` as a custom domain.

## Workout tracker
The phone-first app is at `/workouts/`. It shows the current day's workout only. Strength logging displays target weight and sets × reps, lets you adjust actual reps with +/−, then advances to the next exercise. Run logging shows planned miles and time, accepts actual distance and duration, and calculates pace.

The plan is stored in D1, not hardcoded in the UI. Use Plan → Import CSV to replace the full weekly plan, or export it first. CSV columns:

`day,type,title,exercise,sets,reps,weight,increment,miles,minutes`

One row per exercise. Days Monday through Sunday. Types: strength, run, rest. Strength weight and increment are in pounds. Run distance is miles and planned time is minutes.

### D1 setup
1. Install Wrangler: `npm install -g wrangler`.
2. Run `wrangler login`.
3. Create a database: `wrangler d1 create maxhertlein-workouts`.
4. Copy the returned database ID into `wrangler.toml`, replacing `REPLACE_WITH_D1_DATABASE_ID`.
5. Apply the schema: `wrangler d1 migrations apply maxhertlein-workouts --remote`.
6. Commit the updated `wrangler.toml` and deploy. Confirm the Pages project uses this Wrangler configuration and has the D1 binding named `DB`.

First visit lets you create a 6–12 digit PIN. The PIN is salted and hashed server-side using PBKDF2-SHA-256. Only a Secure, HttpOnly, SameSite=Strict session cookie is sent to the browser. Login attempts are throttled by IP. Do not store secrets in this public repository.

### Progression rule
After meeting target reps, the next target weight increases by the exercise's configured increment. One missed target holds weight. Two consecutive missed targets reduce weight by one increment. The plan's baseline is not overwritten. Actual reps are currently recorded as reps achieved per set across the prescribed sets; this is not individual set-by-set tracking.

## Current limitations
- Workout plan and logs sync through D1 after the database is configured.
- The workout API is unavailable until the D1 database ID and binding are configured.
- Bookmarks remain in browser localStorage and do not sync across devices.
- The sample plan is illustrative; replace it with your own CSV.
