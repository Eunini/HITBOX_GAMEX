# HITBOX GAMEX

Four small browser games by Inioluwa, with daily challenges and personal bests
stored in your browser. This upgrades the original 30-second letter game while
keeping its dark/green identity and the original application under `public/legacy/`.

| Game | What works |
|---|---|
| HITBOX | Seeded letter boards, a monotonic 30-second deadline, streak bonuses, wrong-hit penalties, pause/resume and auto-pause on hidden tabs |
| 2048 | One merge per tile per move, seeded spawning, arrow keys, swipe controls, touch buttons, win/game-over detection and local score saving |
| PAIRS | Eight seeded pairs, mismatch locking, timer cleanup on restart, pause with a hidden board, and a time/move score |
| QUICK DRAW | Five measured rounds, early-tap rejection, cancelled stale timers, and median reaction time |

Search and filter the catalog, save favourites, share a reproducible challenge
seed, switch between dark/light themes and inspect or clear your local scores.
Daily seeds reset at 00:00 UTC. There is no account system or global leaderboard.
The only outbound links are explicit project links; fonts and game images are
self-hosted. Cover images are captures of the actual running boards.

## Run

Node 24+:

```bash
npm ci --ignore-scripts
npm run dev
```

Open `http://localhost:4331`. For the production build:

```bash
npm run build
npm run preview
```

The static `dist/` folder includes the unmodified original app at
`legacy/index.html`. The current root URL and `#about` anchor remain available.
The existing GitHub Pages URL is retained when deploying the Vite build.

## Verify

```bash
npm test
npx playwright install chromium
npm run test:browser
npm audit
```

Browser checks cover timed scoring and restart cleanup, pause/resume, memory
matching, keyboard/swipe 2048, reaction false starts, persistent favourites/scores,
daily challenges, dialog focus, both themes, narrow-screen overflow and axe
accessibility. Reaction timing tests use a controlled clock to check logic;
they are not latency measurements of a user's device.

`src/engines.mjs` contains deterministic pure game engines. The frozen archive
replays 335 calendar days across all four engines. `scripts/capture-covers.mjs`
regenerates actual board images from the running application. Design audit,
screenshots and browser results are under `docs/`. Third-party font/icon/runtime
licenses are retained in `public/licenses/`.

## History and provenance

The original ten commits, including the 30 December 2023 first commit and the
2024 updates, are preserved unchanged. An external Git bundle was verified before
the upgrade. The modernization was implemented in **October 2026**.

The 335 records under `tests/archive/2023/` are synthetic regression scenarios,
generated in 2026 and labelled by 2023 scenario date. An explicitly reconstructed
Git branch dates their fixture commits in 2023. These dates are archive labels,
not actual development, publication or player-activity dates. The final source
integration uses its actual date. GridSense's history and activity remain unchanged.

Original copyright retained: All rights reserved by © Inioluwa.
