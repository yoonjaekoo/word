/* VocaClear — 단어 암기 웹앱 (백준 느낌) */
"use strict";

const DAYS = Object.keys(WORDS).map(Number).sort((a, b) => a - b);
const TOTAL_PER_DAY = 40;

/* ---------- 진행률 저장 (localStorage) ---------- */
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem("voca." + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("voca." + key, JSON.stringify(value)); } catch (e) {}
  },
};

function learnedSet() { return new Set(store.get("learned", [])); }

function markLearned(day, n) {
  const s = learnedSet();
  s.add(day + "-" + n);
  store.set("learned", [...s]);
}

function dayProgress(day) {
  const s = learnedSet();
  return WORDS[String(day)].filter(w => s.has(day + "-" + w.n)).length;
}

function totalLearned() {
  let c = 0;
  for (const d of DAYS) c += dayProgress(d);
  return c;
}

function lastScore() { return store.get("lastScore", null); }

/* ---------- 유틸 ---------- */
const esc = s => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const norm = s => s.trim().toLowerCase().replace(/\s+/g, " ");

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function progressBadge(done) {
  const pct = Math.round((done / TOTAL_PER_DAY) * 100);
  const cls = done >= TOTAL_PER_DAY ? "done" : done > 0 ? "part" : "none";
  const label = done >= TOTAL_PER_DAY ? "완료" : done > 0 ? pct + "%" : "미시작";
  return `<span class="badge ${cls}">${label}</span>`;
}

/* ---------- 라우터 ---------- */
function route() {
  const hash = location.hash || "#/home";
  const [, page, arg] = hash.split("/");
  // 이전 학습 페이지 키보드 핸들러 정리
  if (study && study._bound) {
    document.removeEventListener("keydown", study._bound);
    study._bound = null;
  }
  document.querySelectorAll(".nav-links a").forEach(a => {
    a.classList.toggle("active", a.dataset.nav === page);
  });
  updateNavStats();
  const app = document.getElementById("app");
  if (page === "study") renderStudy(app, arg);
  else if (page === "test") renderTest(app, arg);
  else renderHome(app);
  window.scrollTo(0, 0);
}

function updateNavStats() {
  document.getElementById("navStats").textContent =
    `학습 ${totalLearned()} / ${DAYS.length * TOTAL_PER_DAY} 단어`;
}

/* ---------- 홈: 단어장 목록 ---------- */
function renderHome(app) {
  const score = lastScore();
  const rows = DAYS.map(day => {
    const done = dayProgress(day);
    const pct = Math.round((done / TOTAL_PER_DAY) * 100);
    return `<tr>
      <td>${day}</td>
      <td class="left"><a href="#/study/${day}">DAY ${day} 단어 학습</a></td>
      <td>${TOTAL_PER_DAY}</td>
      <td>${progressBadge(done)}</td>
      <td>
        <div class="progress-bar" title="${pct}%"><i style="width:${pct}%"></i></div>
      </td>
      <td><a href="#/test/${day}">테스트</a></td>
    </tr>`;
  }).join("");

  const scoreHtml = score
    ? `<div class="panel" style="margin-bottom:20px">
         최근 테스트: <strong>DAY ${score.day}</strong> ·
         <strong style="color:var(--blue)">${score.correct}/${score.total}문항 (${score.pct}점)</strong>
         <span style="color:var(--muted)"> — ${esc(score.date)}</span>
         <a class="btn ghost" style="margin-left:12px;padding:5px 14px" href="#/test">테스트 시작</a>
       </div>`
    : `<div class="panel" style="margin-bottom:20px;color:var(--muted)">
         아직 테스트 기록이 없습니다. 한국어 뜻을 보고 영단어를 맞혀 보세요!
         <a class="btn" style="margin-left:12px;padding:5px 18px" href="#/test">테스트 시작</a>
       </div>`;

  app.innerHTML = `
    <h2 class="page-title">보카클리어 고교필수편 단어장</h2>
    <p class="page-sub">DAY 20 ~ DAY 40 · 총 ${DAYS.length * TOTAL_PER_DAY}단어 · 한국어 제시 → 영단어 맞히기</p>
    ${scoreHtml}
    <table class="table">
      <thead>
        <tr>
          <th style="width:70px">Day</th>
          <th class="left">학습</th>
          <th style="width:70px">단어 수</th>
          <th style="width:80px">상태</th>
          <th style="width:160px">진행</th>
          <th style="width:80px">평가</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/* ---------- 학습 ---------- */
let study = null; // {day, idx, revealed}

function renderStudy(app, arg) {
  if (arg && (!study || study.day !== Number(arg))) {
    study = { day: Number(arg), idx: 0, revealed: false };
  }
  if (!study) { location.hash = "#/home"; return; }

  const list = WORDS[String(study.day)];
  const w = list[study.idx];
  const done = dayProgress(study.day);

  app.innerHTML = `
    <h2 class="page-title">DAY ${study.day} 학습</h2>
    <p class="page-sub">진행 ${done}/${list.length} · 제시: <strong>한국어 뜻</strong> → 답: 영단어</p>

    <div class="select-bar row" style="margin-bottom:16px">
      <label>Day 변경:
        <select id="daySel">
          ${DAYS.map(d => `<option value="${d}" ${d === study.day ? "selected" : ""}>DAY ${d}</option>`).join("")}
        </select>
      </label>
      <span style="color:var(--muted)">${study.idx + 1} / ${list.length}번</span>
      <span style="flex:1"></span>
      <button class="btn ghost" id="markBtn">학습 완료로 표시</button>
    </div>

    <div class="study-card">
      <div class="num">DAY ${study.day} · No.${w.n}</div>
      <div class="ko">${esc(w.ko)}</div>
      <div class="en" id="enBox">${study.revealed ? esc(w.en) : "&nbsp;"}</div>
      <div class="hint">${study.revealed ? "스페이스바: 다음 단어" : "스페이스바 또는 클릭: 정답 보기"}</div>
    </div>

    <div class="row" style="justify-content:center;margin-top:16px">
      <button class="btn gray" id="prevBtn" ${study.idx === 0 ? "disabled" : ""}>← 이전</button>
      <button class="btn ghost" id="flipBtn">정답 보기 / 숨기기</button>
      <button class="btn" id="nextBtn" ${study.idx === list.length - 1 ? "disabled" : ""}>다음 →</button>
    </div>

    <div class="dots">
      ${list.map((x, i) => {
        const cls = i === study.idx ? "cur" : (learnedSet().has(study.day + "-" + x.n) ? "ok" : "");
        return `<i class="${cls}" data-i="${i}" title="No.${x.n} ${esc(x.en)}"></i>`;
      }).join("")}
    </div>`;

  const flip = () => { study.revealed = !study.revealed; renderStudy(app, String(study.day)); };
  const go = i => {
    study.idx = Math.max(0, Math.min(list.length - 1, i));
    study.revealed = false;
    renderStudy(app, String(study.day));
  };

  document.getElementById("flipBtn").onclick = flip;
  document.querySelector(".study-card").onclick = e => { if (!e.target.closest("button")) flip(); };
  document.getElementById("prevBtn").onclick = () => go(study.idx - 1);
  document.getElementById("nextBtn").onclick = () => go(study.idx + 1);
  document.getElementById("daySel").onchange = e => { location.hash = "#/study/" + e.target.value; };
  document.getElementById("markBtn").onclick = () => {
    markLearned(study.day, w.n);
    if (study.idx < list.length - 1) go(study.idx + 1);
    else renderStudy(app, String(study.day));
  };
  document.querySelectorAll(".dots i").forEach(el => {
    el.onclick = e => { e.stopPropagation(); go(Number(el.dataset.i)); };
  });

  study.keyHandler = e => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    if (e.code === "Space") { e.preventDefault(); flip(); }
    else if (e.key === "ArrowRight") go(study.idx + 1);
    else if (e.key === "ArrowLeft") go(study.idx - 1);
    else if (e.key === "Enter") { markLearned(study.day, w.n); go(study.idx + 1); }
  };
  document.removeEventListener("keydown", study._bound || (() => {}));
  study._bound = study.keyHandler;
  document.addEventListener("keydown", study.keyHandler);
}

/* ---------- 테스트 ---------- */
let test = null; // {mode, day, list, idx, answers:[], inputDone}

function renderTest(app, arg) {
  // arg가 있으면 해당 Day로 즉시 시작
  if (arg && (!test || test.day !== Number(arg) || test.finished)) {
    startTest(app, "day", Number(arg));
    return;
  }
  if (test && !test.finished) { paintQuiz(app); return; }
  if (test && test.finished) { paintResult(app); return; }

  // 시작 화면
  app.innerHTML = `
    <h2 class="page-title">단어 테스트</h2>
    <p class="page-sub">한국어 뜻이 제시됩니다. 영단어를 입력하세요. (대소문자 무시, 앞뒤 공백 무시)</p>

    <div class="panel" style="max-width:560px">
      <div class="row" style="margin-bottom:16px">
        <div class="mode-toggle">
          <button id="mDay" class="on">Day별</button>
          <button id="mMix">랜덤 혼합</button>
        </div>
        <label id="dayWrap">Day:
          <select id="daySel">
            ${DAYS.map(d => `<option value="${d}">DAY ${d}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="row" style="margin-bottom:16px">
        <label>문항 수:
          <select id="cntSel">
            <option value="10">10문항</option>
            <option value="20">20문항</option>
            <option value="40" selected>40문항 (전체)</option>
          </select>
        </label>
      </div>
      <button class="btn" id="startBtn">테스트 시작</button>
      <span style="color:var(--muted);margin-left:10px">Enter로 제출</span>
    </div>`;

  let mode = "day";
  const mDay = document.getElementById("mDay");
  const mMix = document.getElementById("mMix");
  const dayWrap = document.getElementById("dayWrap");
  mDay.onclick = () => { mode = "day"; mDay.classList.add("on"); mMix.classList.remove("on"); dayWrap.style.display = ""; };
  mMix.onclick = () => { mode = "mix"; mMix.classList.add("on"); mDay.classList.remove("on"); dayWrap.style.display = "none"; };
  document.getElementById("startBtn").onclick = () => {
    const cnt = Number(document.getElementById("cntSel").value);
    const day = Number(document.getElementById("daySel").value);
    startTest(app, mode, day, cnt);
  };
}

function startTest(app, mode, day, cnt) {
  let pool;
  if (mode === "day") {
    pool = WORDS[String(day)].map(w => ({ ...w, day }));
  } else {
    pool = [];
    for (const d of DAYS) for (const w of WORDS[String(d)]) pool.push({ ...w, day: d });
    day = 0;
  }
  const n = Math.min(cnt || 40, pool.length);
  test = {
    mode, day, total: n,
    list: shuffle(pool).slice(0, n),
    idx: 0, answers: [], finished: false,
  };
  paintQuiz(app);
}

function paintQuiz(app) {
  const t = test;
  const w = t.list[t.idx];
  const existing = t.answers[t.idx]; // 이미 채점된 문항이면 그 상태로 복원

  app.innerHTML = `
    <h2 class="page-title">테스트${t.day ? " · DAY " + t.day : " · 랜덤 혼합"}</h2>
    <p class="page-sub">${t.mode === "day" ? "한국어 뜻 → 영단어" : "모든 Day에서 랜덤 출제"}</p>

    <div class="quiz-head">
      <span>${t.idx + 1} / ${t.total}문항${t.day ? "" : ` · DAY ${w.day}`}</span>
      <span>정답 ${t.answers.filter(a => a && a.ok).length}개</span>
    </div>
    <div class="progress-bar" style="margin-bottom:16px">
      <i style="width:${(t.idx / t.total) * 100}%"></i>
    </div>

    <div class="quiz-card">
      <div class="num" style="color:var(--muted);font-size:13px">No.${w.n}</div>
      <div class="q-ko">${esc(w.ko)}</div>
      <input class="answer-input" id="ansInput" autocomplete="off" autocapitalize="off"
             spellcheck="false" placeholder="영단어 입력">
      <div class="verdict" id="verdict"></div>
      <div class="dots">
        ${t.list.map((x, i) => {
          const a = t.answers[i];
          const cls = i === t.idx ? "cur" : (a ? (a.ok ? "ok" : "ng") : "");
          return `<i class="${cls}"></i>`;
        }).join("")}
      </div>
      <div style="margin-top:18px">
        <button class="btn" id="submitBtn">제출</button>
        <button class="btn gray" id="skipBtn" style="margin-left:8px">건너뛰기</button>
        <button class="btn ghost" id="quitBtn" style="margin-left:8px">종료</button>
      </div>
    </div>`;

  const input = document.getElementById("ansInput");
  const submitBtn = document.getElementById("submitBtn");
  const skipBtn = document.getElementById("skipBtn");
  const verdictEl = document.getElementById("verdict");

  // 채점 피드백 표시 + '다음' 버튼으로 전환
  const showGraded = ans => {
    input.value = ans.given || "";
    input.disabled = true;
    input.classList.add(ans.ok ? "ok" : "ng");
    verdictEl.className = "verdict " + (ans.ok ? "ok" : "ng");
    verdictEl.innerHTML = ans.ok
      ? "정답!"
      : `오답 — 정답: <span class="correct">${esc(ans.correct)}</span>`;
    const cur = document.querySelector(".dots i.cur");
    if (cur) cur.className = ans.ok ? "ok" : "ng";
    const isLast = t.idx + 1 >= t.total;
    submitBtn.textContent = isLast ? "결과 보기" : "다음 →";
    submitBtn.onclick = () => {
      if (isLast) { t.finished = true; saveScore(); route(); }
      else { t.idx++; paintQuiz(app); }
    };
    submitBtn.focus();
    skipBtn.style.display = "none";
  };

  const grade = () => {
    if (t.answers[t.idx]) return; // 이미 채점됨
    const val = input.value;
    const ok = norm(val) === norm(w.en);
    const ans = { given: val, ok, correct: w.en, ko: w.ko, day: w.day, n: w.n };
    t.answers[t.idx] = ans;
    if (ok) markLearned(w.day, w.n);
    showGraded(ans);
  };

  if (existing) {
    // 되돌아온 경우: 이미 채점된 상태 그대로 표시
    showGraded(existing);
    return;
  }

  input.focus();
  submitBtn.onclick = grade;
  skipBtn.onclick = () => {
    if (t.answers[t.idx]) return;
    t.answers[t.idx] = { given: "", ok: false, correct: w.en, ko: w.ko, day: w.day, n: w.n, skipped: true };
    if (t.idx + 1 >= t.total) { t.finished = true; saveScore(); route(); }
    else { t.idx++; paintQuiz(app); }
  };
  document.getElementById("quitBtn").onclick = () => { test = null; location.hash = "#/home"; };

  input.onkeydown = e => {
    if (e.key === "Enter") { e.preventDefault(); grade(); }
  };
}

function saveScore() {
  const t = test;
  const correct = t.answers.filter(a => a && a.ok).length;
  store.set("lastScore", {
    day: t.day || "mix",
    correct, total: t.total,
    pct: Math.round((correct / t.total) * 100),
    date: new Date().toLocaleString("ko-KR"),
  });
}

function paintResult(app) {
  const t = test;
  const correct = t.answers.filter(a => a && a.ok).length;
  const pct = Math.round((correct / t.total) * 100);
  const wrongs = t.answers.filter(a => a && !a.ok);
  const grade = pct >= 90 ? "우수" : pct >= 70 ? "양호" : pct >= 50 ? "분발" : "재학습 필요";

  app.innerHTML = `
    <h2 class="page-title">테스트 결과${t.day ? " · DAY " + t.day : " · 랜덤 혼합"}</h2>
    <p class="page-sub">&nbsp;</p>

    <div class="result-score">
      <div class="big">${pct}<span style="font-size:26px">점</span></div>
      <div class="label">${correct} / ${t.total}문항 정답 · ${grade}</div>
    </div>

    <div class="row" style="justify-content:center;margin-bottom:24px">
      <button class="btn" id="retryBtn">다시 테스트</button>
      <button class="btn ghost" id="wrongBtn" ${wrongs.length ? "" : "disabled"}>오답만 재시험</button>
      <a class="btn gray" href="#/home">단어장으로</a>
    </div>

    ${wrongs.length ? `
      <h3 style="font-size:16px">오답 목록 (${wrongs.length}개)</h3>
      <table class="table wrongs">
        <thead>
          <tr><th style="width:70px">Day</th><th style="width:60px">No.</th>
              <th class="left">한국어 뜻</th><th class="left">정답</th><th class="left">내 답</th></tr>
        </thead>
        <tbody>
          ${wrongs.map(a => `<tr>
            <td>${a.day}</td>
            <td>${a.n}</td>
            <td class="left">${esc(a.ko)}</td>
            <td class="left en-cell" style="color:var(--green)">${esc(a.correct)}</td>
            <td class="left" style="color:var(--red)">${a.given ? esc(a.given) : "(미작성)"}</td>
          </tr>`).join("")}
        </tbody>
      </table>` : `<p style="text-align:center;color:var(--green);font-weight:600">🎉 오답이 없습니다. 완벽합니다!</p>`}
  `;

  document.getElementById("retryBtn").onclick = () => {
    startTest(app, t.mode, t.day || undefined, t.total);
  };
  document.getElementById("wrongBtn").onclick = () => {
    if (!wrongs.length) return;
    test = {
      mode: "wrong", day: t.day, total: wrongs.length,
      list: wrongs.map(a => ({ n: a.n, en: a.correct, ko: a.ko, day: a.day })),
      idx: 0, answers: [], finished: false,
    };
    paintQuiz(app);
  };
}

/* ---------- 시작 ---------- */
window.addEventListener("hashchange", route);
route();
