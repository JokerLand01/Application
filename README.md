# Streakle 🟩🟨⬛

**A new word puzzle every day.** Guess the hidden five-letter word in six tries, build a daily streak, and share your score. Streakle is a lightweight, zero-backend web app designed to grow itself and earn revenue over time.

> Live demo: _deploy it (see below) and put the URL here._

---

## Why this app makes money over time

Streakle is built around the three things you asked for: it advertises itself, it pulls people back daily, and it's dead simple to use.

### 1. It advertises itself (free, organic growth)
When a player finishes, they get a **spoiler-free emoji grid** of their solve:

```
Streakle #531 4/6

⬛🟨⬛⬛⬛
⬛🟩⬛🟨⬛
🟨🟩⬛⬛⬛
🟩🟩🟩🟩🟩
```

People post this to group chats, X/Twitter, Instagram stories, etc. It reveals *how well they did without revealing the answer*, which makes friends curious and click through. This is exactly the mechanic that took Wordle from 90 players to millions in three months with **$0 in ad spend**. Every share is a free ad, and shares compound as the player base grows.

### 2. It brings users back every day (retention)
- **One puzzle per day.** Scarcity means players can't binge and burn out — they come back tomorrow.
- **Streak counter + loss aversion.** Nobody wants to break a 40-day streak. This is the single strongest retention hook in casual games.
- **Countdown timer** to the next puzzle creates anticipation.
- **Installable PWA** — players can add it to their home screen like a native app.

### 3. It's easy to use
Tap letters, guess a word. No account, no tutorial, no friction. The shared grid is universally understood, which *helps* virality.

### 4. How the revenue works
Because it's a **static site**, hosting costs are near-zero, so margins stay high as traffic grows.

| Stage | Revenue lever |
|---|---|
| Launch | **Display ads** (Google AdSense) in the two ad slots already built into the layout. |
| Growth | **Premium tier** (~$2–5): remove ads, unlock an **archive** of past puzzles, hard mode, color themes. |
| Scale | **Sponsorships / branded puzzles**, affiliate links, licensing the engine to other brands. |

Revenue scales directly with **daily active users**, and DAU grows through the built-in sharing loop. That's the "over time" compounding you asked for.

---

## Run it locally

It's pure static files — no build step.

```bash
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy (free hosting)

Any static host works. Easiest options:

- **Vercel:** `npx vercel` (a `vercel.json` is already included), or import the repo at vercel.com.
- **Netlify:** drag-and-drop the folder, or connect the repo.
- **GitHub Pages:** enable Pages on this repo → serves the root.
- **Cloudflare Pages:** connect the repo, no build command needed.

## Turn on ads (when you're ready)

1. Create a [Google AdSense](https://adsense.google.com) account and get your `ca-pub-XXXX` publisher ID.
2. In `index.html`, uncomment the AdSense `<script>` in `<head>` and add your ID.
3. Drop `<ins class="adsbygoogle">` units into the two `.ad-slot` containers.

> Tip: AdSense needs real traffic and original content to get approved — launch, share it, get some daily players first, then apply.

---

## How it's built

| File | Purpose |
|---|---|
| `index.html` | Layout, modals, ad slots, social share meta tags. |
| `styles.css` | Responsive mobile-first UI, light/dark themes, animations. |
| `app.js` | Game logic: daily puzzle, scoring, streaks/stats, share grid, countdown. |
| `words.js` | Word lists. The daily answer is chosen deterministically by date, so **every player gets the same word each day** (essential for the social/competitive loop). |
| `manifest.webmanifest` | PWA config so users can install it. |

**Extending the game:** append more words to `ANSWERS` in `words.js` — at one puzzle/day, the list length is how many days it runs before repeating.

---

## Growth playbook (first 1,000 players)

1. **Post your own daily result** every day on your social accounts with the link.
2. Share in relevant communities (puzzle/word-game subreddits, Discords) — follow their self-promo rules.
3. Add a friendly "Share" nudge (already built in) so every win can become a post.
4. Once you have steady daily players, apply for AdSense and add the premium tier.

No paid marketing required — the product is the marketing.
