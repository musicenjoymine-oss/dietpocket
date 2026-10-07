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
- **Health first:** the requested deficit is capped by BMI (≤15% / 500 kcal under BMI 25, ≤20% / 750 kcal to BMI 30, ≤25% / 1000 kcal above), intake never drops below max(1500 M / 1200 F, 90% of BMR), no deficit when underweight or at goal weight, goal weights below BMI 18.5 are rejected, and users must be 18+. Protein is 1.8 g/kg of an adjusted weight (only 25% of weight above BMI 25 counts), capped at 35% of kcal. Water is ~30 ml/kg within 1.5–3.5 L. Every adjustment is shown to the user and passed to the AI coaches.
- Targets use a 3-weigh-in smoothed weight, so calories glide instead of jumping.
- A day keeps the streak when ≥2 of 3 quests are done or it is marked Rest Day; missed days burn a Streak Freeze (2 per run).
- `#太輕` → next suggested load +2.5 kg; `#太重` → −2.5 kg; `#姿勢卡關` → same load.
- Logging a set is 1 tap (prefilled adaptive load) + 1 tap for a tag.
- Storage is Zustand/localStorage; Supabase can replace `store.ts` without touching the rest.
