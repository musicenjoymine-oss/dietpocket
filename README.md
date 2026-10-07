# ⚡ Volt Burn Fit

Gamified fat-loss & strength tracker: a Duolingo-style 28-day quest map on top of a live Mifflin-St Jeor energy engine.

## Run
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # core-logic unit tests
```
Optional: copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY` for real AI coach replies. Without it the three coaches use a local rule-based fallback (same live context, same language).

## Layout
- `src/lib/` — business logic: `nutrition.ts` (BMR/TDEE/macros), `quest.ts` (map, streak, XP, badges, adaptive load), `analytics.ts` (expected vs actual trajectory), `coach.ts` (context + prompts), `i18n.ts` (zh-TW / en), `store.ts` (Zustand, persisted to localStorage).
- `src/components/` — UI. `src/app/api/coach/route.ts` — coach endpoint.

## Design notes
- Nothing derived is stored: targets, streak, XP, badges and trend are recomputed from raw logs, so a new weigh-in or profile edit updates everything without touching quest progress.
- Targets use a 3-weigh-in smoothed weight, so calories glide instead of jumping.
- A day keeps the streak when ≥2 of 3 quests are done or it is marked Rest Day; missed days burn a Streak Freeze (2 per run).
- `#太輕` → next suggested load +2.5 kg; `#太重` → −2.5 kg; `#姿勢卡關` → same load.
- Logging a set is 1 tap (prefilled adaptive load) + 1 tap for a tag.
- Storage is Zustand/localStorage; Supabase can replace `store.ts` without touching the rest.
