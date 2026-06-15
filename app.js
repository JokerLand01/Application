/* Streakle — game logic
 * - Daily puzzle is deterministic by date so all players share the same word.
 * - Progress, stats, and streaks persist in localStorage.
 * - Shareable emoji grid is the viral growth engine.
 */
(function () {
  "use strict";

  const { ANSWERS, ALLOWED } = window.STREAKLE_WORDS;
  const ROWS = 6;
  const COLS = 5;

  // Epoch: day 0 of Streakle. Used to compute a stable daily puzzle number.
  const EPOCH = new Date(2024, 0, 1); // local midnight Jan 1 2024

  // --- Date / puzzle helpers ---------------------------------------------
  function todayIndex() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor((start - EPOCH) / 86400000);
  }
  const PUZZLE_NUMBER = todayIndex();
  const SOLUTION = ANSWERS[((PUZZLE_NUMBER % ANSWERS.length) + ANSWERS.length) % ANSWERS.length].toUpperCase();

  // --- Persistent state ---------------------------------------------------
  const STATE_KEY = "streakle:state";
  const STATS_KEY = "streakle:stats";
  const THEME_KEY = "streakle:theme";

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  let stats = loadJSON(STATS_KEY, {
    played: 0, wins: 0, currentStreak: 0, maxStreak: 0,
    dist: [0, 0, 0, 0, 0, 0], lastWinNumber: null
  });

  // Game state for *today*. Reset if it belongs to a previous day.
  let state = loadJSON(STATE_KEY, null);
  if (!state || state.puzzle !== PUZZLE_NUMBER) {
    state = { puzzle: PUZZLE_NUMBER, guesses: [], status: "playing" };
    saveJSON(STATE_KEY, state);
  }

  // --- DOM ----------------------------------------------------------------
  const boardEl = document.getElementById("board");
  const keyboardEl = document.getElementById("keyboard");
  const toastEl = document.getElementById("toast");

  let current = ""; // letters typed on the active row
  const keyEls = {}; // letter -> button

  // --- Build board --------------------------------------------------------
  const tiles = [];
  for (let r = 0; r < ROWS; r++) {
    const row = document.createElement("div");
    row.className = "row";
    const rowTiles = [];
    for (let c = 0; c < COLS; c++) {
      const t = document.createElement("div");
      t.className = "tile";
      row.appendChild(t);
      rowTiles.push(t);
    }
    boardEl.appendChild(row);
    tiles.push(rowTiles);
  }

  // --- Build keyboard -----------------------------------------------------
  const KB = ["QWERTYUIOP", "ASDFGHJKL", "↵ZXCVBNM⌫"];
  KB.forEach((line) => {
    const rowEl = document.createElement("div");
    rowEl.className = "kb-row";
    [...line].forEach((ch) => {
      const key = document.createElement("button");
      key.className = "key";
      if (ch === "↵") { key.classList.add("wide"); key.textContent = "Enter"; key.dataset.key = "Enter"; }
      else if (ch === "⌫") { key.classList.add("wide"); key.textContent = "⌫"; key.dataset.key = "Backspace"; }
      else { key.textContent = ch; key.dataset.key = ch; keyEls[ch] = key; }
      key.addEventListener("click", () => handleKey(key.dataset.key));
      rowEl.appendChild(key);
    });
    keyboardEl.appendChild(rowEl);
  });

  // --- Toast --------------------------------------------------------------
  let toastTimer;
  function toast(msg, ms = 1500) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  // --- Scoring ------------------------------------------------------------
  function scoreGuess(guess) {
    const result = Array(COLS).fill("absent");
    const solChars = SOLUTION.split("");
    const counts = {};
    solChars.forEach((ch) => (counts[ch] = (counts[ch] || 0) + 1));
    // First pass: correct positions.
    for (let i = 0; i < COLS; i++) {
      if (guess[i] === solChars[i]) { result[i] = "correct"; counts[guess[i]]--; }
    }
    // Second pass: present elsewhere.
    for (let i = 0; i < COLS; i++) {
      if (result[i] === "correct") continue;
      if (counts[guess[i]] > 0) { result[i] = "present"; counts[guess[i]]--; }
    }
    return result;
  }

  function applyKeyColor(letter, type) {
    const el = keyEls[letter];
    if (!el) return;
    // Priority: correct > present > absent. Never downgrade.
    if (el.classList.contains("correct")) return;
    if (type === "correct") { el.classList.remove("present", "absent"); el.classList.add("correct"); }
    else if (type === "present" && !el.classList.contains("present")) { el.classList.remove("absent"); el.classList.add("present"); }
    else if (type === "absent" && !el.classList.contains("present")) { el.classList.add("absent"); }
  }

  // --- Render a completed guess with flip animation -----------------------
  function paintRow(rowIndex, guess, result, animate) {
    const rowTiles = tiles[rowIndex];
    for (let i = 0; i < COLS; i++) {
      const t = rowTiles[i];
      t.textContent = guess[i];
      t.classList.add("filled");
      const reveal = () => { t.classList.add(result[i]); applyKeyColor(guess[i], result[i]); };
      if (animate) {
        setTimeout(() => { t.classList.add("reveal"); setTimeout(reveal, 250); }, i * 300);
      } else {
        reveal();
      }
    }
  }

  // --- Restore prior progress (no animation) ------------------------------
  state.guesses.forEach((g, idx) => paintRow(idx, g, scoreGuess(g), false));

  // --- Input handling -----------------------------------------------------
  function activeRowIndex() { return state.guesses.length; }

  function handleKey(key) {
    if (state.status !== "playing") return;
    if (key === "Enter") return submitGuess();
    if (key === "Backspace") {
      current = current.slice(0, -1);
      renderCurrent();
      return;
    }
    if (/^[A-Z]$/.test(key) && current.length < COLS) {
      current += key;
      renderCurrent();
    }
  }

  function renderCurrent() {
    const r = activeRowIndex();
    if (r >= ROWS) return;
    const rowTiles = tiles[r];
    for (let i = 0; i < COLS; i++) {
      const t = rowTiles[i];
      t.textContent = current[i] || "";
      t.classList.toggle("filled", i < current.length);
    }
  }

  function shakeRow(r) {
    const rowEl = boardEl.children[r];
    rowEl.classList.add("shake");
    setTimeout(() => rowEl.classList.remove("shake"), 500);
  }

  function submitGuess() {
    const r = activeRowIndex();
    if (current.length !== COLS) { shakeRow(r); toast("Not enough letters"); return; }
    if (!ALLOWED.has(current.toLowerCase())) { shakeRow(r); toast("Not in word list"); return; }

    const guess = current;
    const result = scoreGuess(guess);
    paintRow(r, guess, result, true);
    state.guesses.push(guess);
    current = "";

    const won = guess === SOLUTION;
    const lost = !won && state.guesses.length === ROWS;
    const animTime = COLS * 300 + 300;

    if (won) {
      state.status = "won";
      setTimeout(() => {
        boardEl.children[r].classList.add("win");
        const praise = ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"];
        toast(praise[state.guesses.length - 1]);
      }, animTime);
    } else if (lost) {
      state.status = "lost";
      setTimeout(() => toast(SOLUTION, 4000), animTime);
    }

    saveJSON(STATE_KEY, state);

    if (won || lost) {
      recordResult(won, state.guesses.length);
      setTimeout(openStats, animTime + 1200);
    }
  }

  // --- Stats --------------------------------------------------------------
  function recordResult(won, tries) {
    // Guard against double-counting the same puzzle.
    if (stats.lastPlayedNumber === PUZZLE_NUMBER) return;
    stats.lastPlayedNumber = PUZZLE_NUMBER;
    stats.played++;
    if (won) {
      stats.wins++;
      stats.dist[tries - 1]++;
      // Streak: consecutive days. Continue if yesterday's puzzle was the last win.
      if (stats.lastWinNumber === PUZZLE_NUMBER - 1) stats.currentStreak++;
      else stats.currentStreak = 1;
      stats.lastWinNumber = PUZZLE_NUMBER;
      stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    } else {
      stats.currentStreak = 0;
    }
    saveJSON(STATS_KEY, stats);
  }

  function renderStats() {
    document.getElementById("statPlayed").textContent = stats.played;
    document.getElementById("statWinPct").textContent =
      stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
    document.getElementById("statStreak").textContent = stats.currentStreak;
    document.getElementById("statMaxStreak").textContent = stats.maxStreak;

    const chart = document.getElementById("distChart");
    chart.innerHTML = "";
    const max = Math.max(1, ...stats.dist);
    const winRow = state.status === "won" ? state.guesses.length : -1;
    stats.dist.forEach((count, i) => {
      const row = document.createElement("div");
      row.className = "dist-row";
      const label = document.createElement("span");
      label.className = "dist-label";
      label.textContent = i + 1;
      const bar = document.createElement("span");
      bar.className = "dist-bar" + (i + 1 === winRow ? " current" : "");
      bar.style.width = Math.max(8, (count / max) * 100) + "%";
      bar.textContent = count;
      row.append(label, bar);
      chart.appendChild(row);
    });
  }

  // --- Share (the viral engine) -------------------------------------------
  function buildShareText() {
    const tries = state.status === "won" ? state.guesses.length : "X";
    const emoji = { correct: "🟩", present: "🟨", absent: "⬛" };
    const grid = state.guesses
      .map((g) => scoreGuess(g).map((s) => emoji[s]).join(""))
      .join("\n");
    const url = location.origin && location.origin !== "null" ? location.origin : "";
    return `Streakle #${PUZZLE_NUMBER} ${tries}/6\n\n${grid}${url ? "\n\n" + url : ""}`;
  }

  async function share() {
    const text = buildShareText();
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied results to clipboard!");
    } catch {
      toast("Could not copy");
    }
  }

  // --- Modals -------------------------------------------------------------
  function openModal(id) { document.getElementById(id).hidden = false; }
  function closeModal(id) { document.getElementById(id).hidden = true; }
  function openStats() { renderStats(); openModal("statsModal"); startCountdown(); }

  document.getElementById("helpBtn").addEventListener("click", () => openModal("helpModal"));
  document.getElementById("footerHelp").addEventListener("click", (e) => { e.preventDefault(); openModal("helpModal"); });
  document.getElementById("statsBtn").addEventListener("click", openStats);
  document.getElementById("shareBtn").addEventListener("click", share);
  document.querySelectorAll("[data-close]").forEach((btn) =>
    btn.addEventListener("click", () => closeModal(btn.dataset.close))
  );
  document.querySelectorAll(".modal-backdrop").forEach((bd) =>
    bd.addEventListener("click", (e) => { if (e.target === bd) bd.hidden = true; })
  );

  // --- Countdown to next puzzle -------------------------------------------
  let countdownTimer;
  function startCountdown() {
    const el = document.getElementById("countdown");
    function tick() {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      let s = Math.max(0, Math.floor((next - now) / 1000));
      const h = String(Math.floor(s / 3600)).padStart(2, "0");
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      const sec = String(s % 60).padStart(2, "0");
      el.textContent = `${h}:${m}:${sec}`;
    }
    tick();
    clearInterval(countdownTimer);
    countdownTimer = setInterval(tick, 1000);
  }

  // --- Theme --------------------------------------------------------------
  const themeBtn = document.getElementById("themeBtn");
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
    saveJSON(THEME_KEY, theme);
  }
  applyTheme(loadJSON(THEME_KEY, window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  themeBtn.addEventListener("click", () =>
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark")
  );

  // --- Physical keyboard --------------------------------------------------
  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("helpModal").hidden || !document.getElementById("statsModal").hidden) return;
    if (e.key === "Enter") handleKey("Enter");
    else if (e.key === "Backspace") handleKey("Backspace");
    else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
  });

  // --- On load: if already finished today, show stats ---------------------
  if (state.status !== "playing") {
    setTimeout(openStats, 400);
  } else if (stats.played === 0 && state.guesses.length === 0) {
    setTimeout(() => openModal("helpModal"), 300); // first-time onboarding
  }
})();
