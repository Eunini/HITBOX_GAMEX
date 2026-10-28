import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Heart,
  Moon,
  Sun,
  X,
  MagnifyingGlass,
  GameController,
  Copy,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { Hitbox, Tiles, Memory, Reaction } from "./games.jsx";
import { dailySeed } from "./engines.mjs";

export const games = [
  {
    id: "hitbox",
    name: "HITBOX",
    category: "Reflex",
    duration: "30 seconds",
    description: "Find the letter. Keep your streak. Beat the clock.",
    number: "01",
  },
  {
    id: "tiles",
    name: "2048",
    category: "Puzzle",
    duration: "Your own pace",
    description: "Slide, merge and make room for one more move.",
    number: "02",
  },
  {
    id: "memory",
    name: "PAIRS",
    category: "Memory",
    duration: "16 cards",
    description: "Eight pairs. A little focus goes a long way.",
    number: "03",
  },
  {
    id: "reaction",
    name: "QUICK DRAW",
    category: "Reflex",
    duration: "5 rounds",
    description: "Wait for green. Let your reflexes do the rest.",
    number: "04",
  },
];
const today = () => new Date().toISOString().slice(0, 10);
const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0] || 1;
function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function App() {
  const [theme, setTheme] = useState(() => load("hitbox-theme", "dark"));
  const [favourites, setFavourites] = useState(() => {
    const stored = load("hitbox-favourites", []);
    return Array.isArray(stored)
      ? stored.filter((id) => games.some((game) => game.id === id))
      : [];
  });
  const [scores, setScores] = useState(() => {
    const stored = load("hitbox-scores", {});
    return stored && typeof stored === "object" && !Array.isArray(stored)
      ? stored
      : {};
  });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All games");
  const [active, setActive] = useState(() => {
    const params = new URLSearchParams(location.search);
    const game = games.find((item) => item.id === params.get("game"));
    const seed = Number(params.get("seed"));
    return game && Number.isInteger(seed) && seed > 0 && seed <= 0xffffffff
      ? {
          game,
          seed,
          day:
            params.get("day") === today() &&
            seed === dailySeed(today(), game.id)
              ? today()
              : null,
        }
      : null;
  });
  const [showScores, setShowScores] = useState(false);
  const [notice, setNotice] = useState("");
  const [day, setDay] = useState(today);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    save("hitbox-theme", theme);
  }, [theme]);
  useEffect(() => {
    const timer = setInterval(() => setDay(today()), 30000);
    return () => clearInterval(timer);
  }, []);
  const open = (game, daily = false) =>
    setActive({
      game,
      seed: daily ? dailySeed(day, game.id) : freshSeed(),
      day: daily ? day : null,
    });
  const favourite = (id) =>
    setFavourites((current) => {
      const next = current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id];
      save("hitbox-favourites", next);
      return next;
    });
  const completed = (game, value, unit, seed, daily) => {
    if (!Number.isFinite(value) || value < 0) return;
    setScores((current) => {
      const old = current[game.id];
      const improved =
        !old ||
        !Number.isFinite(old.value) ||
        (game.id === "reaction" ? value < old.value : value > old.value);
      if (!improved) return current;
      const next = {
        ...current,
        [game.id]: {
          value,
          unit,
          seed,
          day: daily,
          finishedAt: new Date().toISOString(),
        },
      };
      save("hitbox-scores", next);
      return next;
    });
  };
  const listed = games.filter(
    (game) =>
      `${game.name} ${game.description} ${game.category}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All games" ||
        filter === game.category ||
        (filter === "Saved" && favourites.includes(game.id))),
  );
  return (
    <>
      <a className="skip" href="#games">
        Skip to games
      </a>
      <header className="site-header">
        <a className="wordmark" href="#top">
          <span aria-hidden="true">
            H<span className="logo-dot">.</span>
          </span>
          <span>
            HITBOX<span>GAMEX</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#games">Games</a>
          <a href="#daily">Daily challenge</a>
          <button onClick={() => setShowScores(true)}>Your scores</button>
          <a href="#about">About</a>
        </nav>
        <button
          className="icon-button theme-toggle"
          aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>
      <main id="top">
        <section className="hero">
          <div>
            <p className="hero-kicker">
              <span aria-hidden="true" />
              JUST ONE MORE ROUND.
            </p>
            <h1>
              Small games.
              <br />
              <em>Big rematches.</em>
            </h1>
            <p className="hero-description">
              Four little browser games for the competitive part of your brain.
            </p>
            <button className="primary" onClick={() => open(games[0])}>
              Play HITBOX <ArrowRight size={20} />
            </button>
            <div className="hero-meta">
              <span>Keyboard + touch</span>
              <span>No account needed</span>
            </div>
          </div>
          <div className="hero-board">
            <img
              src="./covers/hitbox.png"
              alt="The actual HITBOX letter board"
            />
            <div className="preview-caption">
              <span>THE ORIGINAL / HITBOX</span>
              <ArrowRight size={22} />
            </div>
          </div>
        </section>
        <section id="games" className="games-section">
          <div className="section-top">
            <h2>Pick your next five minutes.</h2>
            <p>Small rules. Plenty of room to improve.</p>
          </div>
          <div className="filters">
            <label className="search">
              <MagnifyingGlass size={18} />
              <span className="sr-only">Search games</span>
              <input
                placeholder="Find your game"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="filter-buttons" aria-label="Game categories">
              {["All games", "Reflex", "Puzzle", "Memory", "Saved"].map(
                (value) => (
                  <button
                    aria-pressed={filter === value}
                    className={filter === value ? "selected" : ""}
                    onClick={() => setFilter(value)}
                    key={value}
                  >
                    {value}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="game-cards">
            {listed.map((game) => (
              <article className={`game-card card-${game.id}`} key={game.id}>
                <div className="game-art">
                  <span className="game-number">/{game.number}</span>
                  <img
                    src={`./covers/${game.id}.png`}
                    alt={`${game.name} captured from the running game`}
                    loading="lazy"
                  />
                  <button
                    className={`save-game ${favourites.includes(game.id) ? "saved" : ""}`}
                    aria-label={`${favourites.includes(game.id) ? "Unsave" : "Save"} ${game.name}`}
                    aria-pressed={favourites.includes(game.id)}
                    onClick={() => favourite(game.id)}
                  >
                    <Heart
                      size={21}
                      weight={favourites.includes(game.id) ? "fill" : "regular"}
                    />
                  </button>
                </div>
                <div className="game-copy">
                  <div className="game-category">
                    <span>{game.category}</span>
                    <span>{game.duration}</span>
                  </div>
                  <h3>{game.name}</h3>
                  <p>{game.description}</p>
                  <div className="card-action">
                    <button onClick={() => open(game)}>
                      Play game <ArrowRight size={20} />
                    </button>
                    <span>
                      {Number.isFinite(scores[game.id]?.value)
                        ? `Best: ${scores[game.id].value} ${scores[game.id].unit}`
                        : "Set your first best"}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!listed.length && (
            <div className="empty-state">
              <GameController size={36} />
              <h3>No games here yet.</h3>
              <p>Try another search, or save a game with the heart button.</p>
              <button
                onClick={() => {
                  setFilter("All games");
                  setQuery("");
                }}
              >
                Show all games
              </button>
            </div>
          )}
        </section>
        <section id="daily" className="daily-section">
          <div className="daily-number" aria-hidden="true">
            24<span>H</span>
          </div>
          <div>
            <p className="section-label">A FRESH CHALLENGE, EVERY DAY</p>
            <h2>
              Same board.
              <br />
              Your best shot.
            </h2>
            <p>
              Today’s HITBOX seed is the same for everyone. Give it a go, then
              share the challenge.
            </p>
            <p className="daily-date">{day} · resets at 00:00 UTC</p>
          </div>
          <button className="primary" onClick={() => open(games[0], true)}>
            Play today’s challenge <ArrowRight size={20} />
          </button>
        </section>
        <section id="about" className="about-section">
          <span className="about-mark" aria-hidden="true">
            hi<span>.</span>
          </span>
          <div>
            <h2>Hii, I’m Inioluwa.</h2>
            <p>
              This started as a simple letter game made out of boredom. It grew
              into a little arcade for short breaks and friendly rematches.
            </p>
            <p>
              Your scores and saved games stay in this browser. There’s no
              global leaderboard or tracking account.
            </p>
            <div className="about-links">
              <a
                href="https://github.com/Eunini/HITBOX_GAMEX"
                target="_blank"
                rel="noreferrer"
              >
                Give it a star on GitHub <ArrowRight size={16} />
              </a>
              <a href="./legacy/index.html">
                Play the original version <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </section>
        <p className="storage-notice" role="status">
          {notice}
        </p>
      </main>
      <footer>
        <a className="footer-brand" href="#top">
          HITBOX GAMEX
        </a>
        <span>All rights reserved by © Inioluwa</span>
        <button
          onClick={() => {
            try {
              localStorage.removeItem("hitbox-scores");
              localStorage.removeItem("hitbox-favourites");
            } catch {}
            setScores({});
            setFavourites([]);
            setNotice("Local scores and saved games cleared.");
          }}
        >
          Clear local scores
        </button>
      </footer>
      {active && (
        <GameDialog
          key={`${active.game.id}-${active.seed}`}
          {...active}
          close={() => setActive(null)}
          onComplete={completed}
        />
      )}
      {showScores && (
        <Modal title="Your personal bests" close={() => setShowScores(false)}>
          <p className="muted">
            Stored on this browser only. Reaction time is better when lower.
          </p>
          <div className="score-list">
            {games.map((game) => (
              <div key={game.id}>
                <span>{game.name}</span>
                <strong>
                  {Number.isFinite(scores[game.id]?.value)
                    ? `${scores[game.id].value} ${scores[game.id].unit}`
                    : "Not played yet"}
                </strong>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
export function Modal({ title, close, children, className = "" }) {
  const ref = useRef();
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (
        previousFocus instanceof HTMLElement &&
        document.contains(previousFocus)
      )
        previousFocus.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={title}
      onCancel={close}
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
    >
      <div className="modal-header">
        <span>{title}</span>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function GameDialog({ game, seed, day, close, onComplete }) {
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState("");
  const complete = (value, unit = "pts") =>
    onComplete(game, value, unit, seed, day);
  const Component = {
    hitbox: Hitbox,
    tiles: Tiles,
    memory: Memory,
    reaction: Reaction,
  }[game.id];
  async function copy() {
    const url = new URL(location.href);
    url.search = new URLSearchParams({
      game: game.id,
      seed,
      ...(day ? { day } : {}),
    });
    try {
      await navigator.clipboard.writeText(url.href);
      setCopied("Challenge link copied.");
    } catch {
      setCopied("Copy is unavailable in this browser.");
    }
  }
  return (
    <Modal
      title={`${game.name}${day ? " · Daily challenge" : ""}`}
      close={close}
      className="game-modal"
    >
      <Component key={attempt} seed={seed} onComplete={complete} />
      <div className="game-footer">
        <button onClick={() => setAttempt((value) => value + 1)}>
          <ArrowClockwise size={17} /> Restart
        </button>
        <button onClick={copy}>
          <Copy size={17} /> Share this seed
        </button>
      </div>
      <p className="fine game-note" role="status">
        {copied ||
          `Seed ${seed}${day ? ` · ${day} UTC` : " · Practice"} · Local scores only`}
      </p>
    </Modal>
  );
}
