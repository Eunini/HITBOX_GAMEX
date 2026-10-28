import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
} from "@phosphor-icons/react";
import {
  hitboxInitial,
  hitboxPick,
  tilesInitial,
  tilesMove,
  memoryInitial,
  memoryFlip,
  memoryConceal,
  memoryScore,
  reactionDelay,
  median,
} from "./engines.mjs";

function useClock(limit = Infinity) {
  const [phase, setPhase] = useState("ready");
  const [elapsed, setElapsed] = useState(0);
  const total = useRef(0),
    since = useRef(0);
  const now = () =>
    Math.min(
      limit,
      total.current +
        (phase === "running" ? performance.now() - since.current : 0),
    );
  const start = () => {
    since.current = performance.now();
    setPhase("running");
  };
  const stop = (next) => {
    const value = now();
    total.current = value;
    setElapsed(value);
    setPhase(value >= limit ? "done" : next);
    return value;
  };
  useEffect(() => {
    if (phase !== "running") return;
    const tick = () => {
      const value = now();
      setElapsed(value);
      if (value >= limit) {
        total.current = value;
        setPhase("done");
      }
    };
    const timer = setInterval(tick, 50);
    const hidden = () => {
      if (document.hidden) stop("paused");
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [phase]);
  return {
    phase,
    elapsed,
    now,
    start,
    pause: () => stop("paused"),
    finish: () => stop("done"),
  };
}
function Metrics({ children }) {
  return <div className="game-metrics">{children}</div>;
}
function Metric({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function ClockButton({ clock, label }) {
  if (clock.phase === "done") return null;
  return clock.phase === "running" ? (
    <button className="secondary full" onClick={clock.pause}>
      <Pause size={18} /> Pause
    </button>
  ) : (
    <button className="primary full" onClick={clock.start}>
      <Play size={18} /> {clock.phase === "paused" ? "Resume" : label}
    </button>
  );
}

export function Hitbox({ seed, onComplete }) {
  const [state, setState] = useState(() => hitboxInitial(seed));
  const clock = useClock(30000);
  const reported = useRef(false);
  useEffect(() => {
    if (clock.phase === "done" && !reported.current) {
      reported.current = true;
      onComplete(state.score);
    }
  }, [clock.phase]);
  const pick = (letter) => {
    if (clock.phase !== "running") return;
    if (clock.now() >= 30000) {
      clock.finish();
      return;
    }
    setState((current) => hitboxPick(current, letter));
  };
  return (
    <>
      <Metrics>
        <Metric
          label="Time"
          value={`${Math.ceil((30000 - clock.elapsed) / 1000)}s`}
        />
        <Metric label="Score" value={state.score} />
        <Metric label="Streak" value={`${state.streak}×`} />
      </Metrics>
      <p className="game-instructions">
        Find the target letter. Correct +10, wrong −2. Every fifth consecutive
        hit earns +10 extra.
      </p>
      <div className="hitbox-target">
        <span>FIND</span>
        <strong>{state.target}</strong>
      </div>
      <div
        className={`letter-board ${clock.phase === "paused" ? "board-paused" : ""}`}
        aria-label="Letter choices"
      >
        {state.letters.map((letter) => (
          <button
            key={letter}
            onClick={() => pick(letter)}
            disabled={clock.phase !== "running"}
            aria-label={`Letter ${letter}`}
          >
            {clock.phase === "paused" ? "·" : letter}
          </button>
        ))}
      </div>
      <div className="game-status" role="status">
        {clock.phase === "done"
          ? `Time! ${state.hits} hits, ${state.misses} misses. Final score: ${state.score}.`
          : clock.phase === "paused"
            ? "Paused. Your time is saved."
            : clock.phase === "ready"
              ? "You have 30 seconds. Ready?"
              : `${state.hits} hits · ${state.misses} misses`}
      </div>
      <ClockButton clock={clock} label="Start 30-second game" />
    </>
  );
}

export function Tiles({ seed, onComplete }) {
  const [state, setState] = useState(() => tilesInitial(seed));
  const reported = useRef(false);
  const touch = useRef();
  const move = (direction) =>
    setState((current) => tilesMove(current, direction));
  useEffect(() => {
    const key = (event) => {
      const direction = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      }[event.key];
      if (
        direction &&
        !["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)
      ) {
        event.preventDefault();
        move(direction);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if ((state.won || state.over) && !reported.current) {
      reported.current = true;
      onComplete(state.score);
    }
  }, [state.won, state.over]);
  return (
    <>
      <Metrics>
        <Metric label="Score" value={state.score} />
        <Metric label="Moves" value={state.moves} />
        <Metric label="Highest tile" value={Math.max(...state.board)} />
      </Metrics>
      <p className="game-instructions">
        Use arrow keys, swipe the board or use the direction buttons. Equal
        tiles merge once per move.
      </p>
      <div
        className="tiles-board"
        aria-label="2048 board"
        onTouchStart={(event) => {
          const finger = event.touches[0];
          touch.current = { x: finger.clientX, y: finger.clientY };
        }}
        onTouchEnd={(event) => {
          if (!touch.current) return;
          const finger = event.changedTouches[0];
          const dx = finger.clientX - touch.current.x,
            dy = finger.clientY - touch.current.y;
          touch.current = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
          move(
            Math.abs(dx) > Math.abs(dy)
              ? dx > 0
                ? "right"
                : "left"
              : dy > 0
                ? "down"
                : "up",
          );
        }}
      >
        {state.board.map((value, index) => (
          <div
            key={index}
            className={`number-tile value-${Math.min(value, 2048)}`}
            aria-label={`Cell ${index + 1}: ${value || "empty"}`}
          >
            {value || ""}
          </div>
        ))}
      </div>
      <div className="direction-pad">
        {[
          ["up", ArrowUp],
          ["left", ArrowLeft],
          ["down", ArrowDown],
          ["right", ArrowRight],
        ].map(([direction, Icon]) => (
          <button
            key={direction}
            aria-label={`Move ${direction}`}
            onClick={() => move(direction)}
          >
            <Icon size={21} />
          </button>
        ))}
      </div>
      <p className="game-status" role="status">
        {state.over
          ? `No moves left. Final score: ${state.score}.`
          : state.won
            ? "You reached 2048! Keep playing if you like."
            : "Make a little room for your next move."}
      </p>
      <button
        className="secondary full"
        onClick={() => onComplete(state.score)}
      >
        Save this score
      </button>
    </>
  );
}

export function Memory({ seed, onComplete }) {
  const [state, setState] = useState(() => memoryInitial(seed));
  const clock = useClock();
  const reported = useRef(false);
  useEffect(() => {
    if (!state.locked || clock.phase !== "running") return;
    const timer = setTimeout(
      () => setState((current) => memoryConceal(current)),
      650,
    );
    return () => clearTimeout(timer);
  }, [state.locked, clock.phase]);
  useEffect(() => {
    if (state.won && !reported.current) {
      const elapsed = clock.finish();
      reported.current = true;
      onComplete(memoryScore(state.moves, elapsed));
    }
  }, [state.won]);
  return (
    <>
      <Metrics>
        <Metric label="Pairs" value={`${state.matched.length / 2}/8`} />
        <Metric label="Moves" value={state.moves} />
        <Metric label="Time" value={`${Math.floor(clock.elapsed / 1000)}s`} />
      </Metrics>
      <p className="game-instructions">
        Find the eight matching number pairs. Fewer moves and less time give a
        higher score.
      </p>
      <div className="memory-board">
        {state.cards.map((value, index) => {
          const visible =
            clock.phase !== "paused" &&
            (state.open.includes(index) || state.matched.includes(index));
          return (
            <button
              key={index}
              className={visible ? "revealed" : ""}
              aria-label={`Card ${index + 1}${visible ? `: ${value + 1}${state.matched.includes(index) ? ", matched" : ""}` : ", face down"}`}
              aria-pressed={visible}
              disabled={
                clock.phase !== "running" ||
                state.locked ||
                state.matched.includes(index)
              }
              onClick={() => setState((current) => memoryFlip(current, index))}
            >
              {visible ? value + 1 : "?"}
            </button>
          );
        })}
      </div>
      <p className="game-status" role="status">
        {clock.phase === "done"
          ? `All pairs found! Score: ${memoryScore(state.moves, clock.elapsed)}.`
          : clock.phase === "paused"
            ? "Paused. The board is hidden."
            : clock.phase === "ready"
              ? "Your timer starts when you begin."
              : state.locked
                ? "Not a match. Try another pair."
                : "Choose two cards."}
      </p>
      <ClockButton clock={clock} label="Start matching" />
    </>
  );
}

export function Reaction({ seed, onComplete }) {
  const [phase, setPhase] = useState("ready");
  const [times, setTimes] = useState([]);
  const [misses, setMisses] = useState(0);
  const timer = useRef();
  const currentSeed = useRef(seed);
  const readyAt = useRef(0);
  const reported = useRef(false);
  const clear = () => clearTimeout(timer.current);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        clear();
        setPhase((current) =>
          ["waiting", "go"].includes(current) ? "ready" : current,
        );
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      clear();
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  const next = () => {
    clear();
    const draw = reactionDelay(currentSeed.current);
    currentSeed.current = draw.seed;
    setPhase("waiting");
    timer.current = setTimeout(() => {
      readyAt.current = performance.now();
      setPhase("go");
    }, draw.milliseconds);
  };
  const press = () => {
    if (phase === "waiting") {
      clear();
      setMisses((value) => value + 1);
      setPhase("early");
    } else if (phase === "go") {
      const value = Math.max(
        0,
        Math.round(performance.now() - readyAt.current),
      );
      const results = [...times, value];
      setTimes(results);
      if (results.length === 5) {
        setPhase("done");
        if (!reported.current) {
          reported.current = true;
          onComplete(Math.round(median(results)), "ms");
        }
      } else setPhase("result");
    } else if (phase !== "done") next();
  };
  return (
    <>
      <Metrics>
        <Metric label="Round" value={`${Math.min(times.length + 1, 5)}/5`} />
        <Metric
          label="Median"
          value={times.length ? `${Math.round(median(times))}ms` : "No rounds"}
        />
        <Metric label="Early taps" value={misses} />
      </Metrics>
      <p className="game-instructions">
        Tap only when the button says GO. Complete five rounds; your median
        reaction time is the result.
      </p>
      <button
        className={`reaction-button reaction-${phase}`}
        onClick={press}
        disabled={phase === "done"}
      >
        <span>
          {phase === "go"
            ? "GO"
            : phase === "waiting"
              ? "WAIT…"
              : phase === "early"
                ? "TOO SOON"
                : phase === "result"
                  ? `${times.at(-1)} ms`
                  : phase === "done"
                    ? `${Math.round(median(times))} ms`
                    : "READY?"}
        </span>
        <small>
          {phase === "go"
            ? "Tap now"
            : phase === "waiting"
              ? "Wait for green"
              : phase === "done"
                ? "Five-round median"
                : "Tap to start the next round"}
        </small>
      </button>
      <p className="game-status" role="status">
        {phase === "early"
          ? "Early tap. This round did not count."
          : phase === "done"
            ? "Five rounds complete. Lower is better."
            : "Keyboard: focus the button and press Space or Enter."}
      </p>
      <div className="reaction-results">
        {times.map((time, index) => (
          <span key={index}>
            R{index + 1} <strong>{time}ms</strong>
          </span>
        ))}
      </div>
    </>
  );
}
