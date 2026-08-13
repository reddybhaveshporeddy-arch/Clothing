# Fit Check — Wardrobe & Outfit Planner

Upload photos of the clothes you actually own, get outfit suggestions built from
them, and track what you wore on which day.

Single user, no login. Runs locally or deployed to Vercel — both point at the
same Postgres database.

## Setup

```bash
npm install
```

Create a Postgres database (Vercel Postgres, Neon, Supabase — any of them
work) and put its connection string in `.env` as `DATABASE_URL` (see
[Environment variables](#environment-variables)), then:

```bash
npx prisma db push
```

```bash
npm run dev
```

Open http://localhost:3000. The first launch sends you through a short style
quiz, then drops you in the wardrobe.

### Demo data (optional)

To click through the app before photographing your own clothes:

```bash
npm run seed
```

This adds 16 demo items and a style profile, using flat-color placeholder
images. It does nothing if your wardrobe already has items — to start over,
clear the tables (`npx prisma db push --force-reset`) and re-seed.

## Profiles — sharing one instance

Several people can use the same running app, each with their own wardrobe,
outfits, style quiz and wear history. On first load you get a **"Who's using
this?"** picker; the choice is stored in a cookie, so each device remembers
independently — your phone and your laptop can even be on different profiles at
the same time.

- **Add a profile** from the picker (name, color, icon). A new profile starts
  with an empty closet and takes its own style quiz.
- **Switch** any time from the avatar menu in the top-right.
- **Delete** a profile via *Manage profiles*. This removes that person's items,
  outfits, history and uploaded photos — and nothing else.

**Profiles are separation, not security.** There are no passwords: anyone who
can open the app can pick any profile and see that wardrobe. That's the right
tradeoff for a household on one Wi-Fi network, and the wrong one for anything
public. If this ever needs to be real multi-user, the data is already scoped
per profile — `lib/profile.ts` is the single place a session check would go.

## Using it on your phone

The app is mobile-first, and the photo picker opens the camera directly, so a
phone is the natural way to use it. Two options:

### Over your home Wi-Fi (works today)

Your laptop stays the server; the phone is just a browser. Both devices must be
on the same network, and the laptop has to be awake with the server running.

1. Start the server bound to the network rather than just localhost:

   ```bash
   npm run dev:lan
   ```

2. Allow the connection through Windows Firewall — **once**, from an
   **Administrator** PowerShell. The default Node rules only cover Public
   networks, so a home (Private) Wi-Fi is blocked without this:

   ```bash
   New-NetFirewallRule -DisplayName "Fit Check dev (3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Private
   ```

3. Find your laptop's Wi-Fi address:

   ```bash
   ipconfig
   ```

4. On your phone, open `http://<that-address>:3000`.

Your address may change when you reconnect to Wi-Fi; re-run step 3 if the page
stops loading. To remove the firewall rule later:

```bash
Remove-NetFirewallRule -DisplayName "Fit Check dev (3000)"
```

### Add it to your home screen

Once the page loads on your phone, use **Share → Add to Home Screen** (iOS) or
**⋮ → Add to Home screen** (Android). The web manifest makes it launch
full-screen with its own icon, without browser chrome — it behaves like an
installed app. It still needs the laptop's server to be running.

### Anywhere, without the laptop

That needs deploying, which means replacing the two pieces that assume a local
machine — see [Deploying](#deploying-to-vercel) below.

## Environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable                | Required | Purpose                                                          |
| ----------------------- | -------- | ----------------------------------------------------------------- |
| `DATABASE_URL`          | yes      | Postgres connection string.                                       |
| `BLOB_READ_WRITE_TOKEN` | deployed only | Vercel Blob token for uploaded photos. Unset locally — local dev writes straight to `public/uploads` instead. |
| `ANTHROPIC_API_KEY`     | no       | AI-written style notes and photo classification (`claude-haiku-4-5-20251001`) |

**Without an API key the app works fully** — style notes come from a local
rule-based writer instead. Every Claude call also falls back to that writer on
a network error or rate limit, so outfit generation never breaks.

## Pages

| Route            | What it does                                                        |
| ---------------- | ------------------------------------------------------------------- |
| `/profiles`      | "Who's using this?" — pick, add, or manage profiles                  |
| `/`              | Dashboard — "what should I wear today?", weather, streak, stats      |
| `/onboarding`    | Six-question style quiz (re-open any time via "Style profile")       |
| `/wardrobe`      | Your clothes: add, edit, filter, search, per-item wear history       |
| `/outfits`       | Auto-generate 5 scored outfits, or build one by hand                 |
| `/calendar`      | Monthly wear history, log or plan a day, stats sidebar               |
| `/saved-outfits` | Saved outfits with tags, sorting, image export                       |

## How outfits are scored

Every candidate outfit gets a 0–100 score:

| Component          | Points  | Rule                                                          |
| ------------------ | ------- | ------------------------------------------------------------- |
| Color harmony      | 0–40    | Neutrals pair with anything; two saturated colors score low unless complementary; more than 3 distinct colors is penalized |
| Style consistency  | 0–30    | One shared style tag scores full; preppy + streetwear conflicts |
| Season             | 0–15    | Current season detected from the system date; adjacent seasons score partial |
| Your preferences   | 0–15    | Quiz colors and vibe boost; avoided colors subtract            |
| Recency penalty    | up to −20 | Items worn in the last 3 days score lower, to encourage variety |

Suggestions are sorted by score. The generator also diversifies results so five
suggestions aren't five variations of the same top, and it filters out items
that are wrong for the season.

Tap "Why this score?" on any suggestion to see the breakdown.

Colors are matched numerically rather than by string, so `black`, `#111`, and
`washed navy` all behave sensibly. Neutrals include the wearable ones — navy,
brown, beige, olive — not just greyscale.

## Notes on behavior

- **Photos** are compressed in the browser (max 1200px, JPEG) before upload.
  Stored in `public/uploads/` locally, or Vercel Blob when deployed. JPEG,
  PNG, WebP and GIF only, 8MB limit — HEIC/HEIF (the iPhone default) is
  converted to JPEG client-side before that check runs.
- **Logging a day replaces it.** One outfit per day; re-logging overwrites.
- **Wear counts are recomputed from the log**, not incremented, so editing or
  clearing a day keeps `timesWorn` and `lastWornDate` honest.
- **Deleting an item** removes it from history and deletes any saved outfit left
  with fewer than two pieces. Wear history for other items on those days stays.
- **Weather** uses Open-Meteo (no API key) and needs location permission. Deny
  it and you still get suggestions, just without the weather adjustment.

## API

Every route below operates on **the profile selected on the calling device**,
resolved from the `fitcheck.profile` cookie. With no profile selected they
return `409 {code: "NO_PROFILE"}`, which is what sends the browser to the picker.

```
GET    /api/profiles            list profiles + which one this device uses
POST   /api/profiles            create a profile
PATCH  /api/profiles/[id]       rename / recolor
DELETE /api/profiles/[id]       delete a profile and everything in it
POST   /api/profiles/select     switch this device to a profile
DELETE /api/profiles/select     sign out, back to the picker

POST   /api/clothing            add item (multipart/form-data)
GET    /api/clothing            list items (category, color, tag, season, search)
PUT    /api/clothing/[id]       update item (multipart or JSON)
DELETE /api/clothing/[id]       delete item
GET    /api/clothing/[id]/history   days this item was worn

POST   /api/outfits/generate    run the matching engine, return top N
POST   /api/outfits/save        save an outfit
GET    /api/outfits             list saved outfits (sort, tag)
PATCH  /api/outfits/[id]        rename / retag
DELETE /api/outfits/[id]        delete saved outfit

POST   /api/wear-log            log a day
GET    /api/wear-log            wear history (from, to)
DELETE /api/wear-log?date=      clear a day
GET    /api/wear-log/stats      streak, most/least worn, color breakdown

GET    /api/style-profile       quiz answers
POST   /api/style-profile       save quiz answers
DELETE /api/style-profile       reset (re-triggers onboarding)

POST   /api/claude/style-note   style note + score for a set of items
GET    /api/today               today's best outfit (lat, lon for weather)
```

## Deploying to Vercel

1. Create a Postgres database (Vercel Storage tab → Create Database, or
   Neon/Supabase) and connect it to the project — this sets `DATABASE_URL`
   automatically if created through Vercel's dashboard.
2. Create a Blob store (Vercel Storage tab → Create → Blob) and connect it —
   this sets `BLOB_READ_WRITE_TOKEN` automatically.
3. Add `ANTHROPIC_API_KEY` under Project Settings → Environment Variables, if
   you want AI features live.
4. Push to the connected GitHub repo, or redeploy from the dashboard. The
   build script runs `prisma db push` before `next build`, so the schema
   syncs to whatever Postgres database is connected — no manual migration
   step needed.

Local dev and the deployed app can point at the same Postgres database (put
the same `DATABASE_URL` in your local `.env`), or you can use a separate one
for local experimentation — either works.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma + Postgres ·
Vercel Blob (deployed) · Anthropic SDK (optional)
