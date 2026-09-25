const DEFAULT_MINUTES = 30;
const MONTH_GOAL_DAYS = 20;
const STORAGE_KEY = 'stillMeditationSessionsV1';

const timeDisplay = document.getElementById('timeDisplay');
const timerState = document.getElementById('timerState');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const soundTestBtn = document.getElementById('soundTestBtn');
const startBellToggle = document.getElementById('startBellToggle');
const endBellToggle = document.getElementById('endBellToggle');
const ringProgress = document.getElementById('ringProgress');
const presetButtons = [...document.querySelectorAll('.preset[data-minutes]')];
const customTimeBtn = document.getElementById('customTimeBtn');
const customTimePanel = document.getElementById('customTimePanel');
const customHours = document.getElementById('customHours');
const customMinutes = document.getElementById('customMinutes');
const customSetBtn = document.getElementById('customSetBtn');

const currentStreakEl = document.getElementById('currentStreak');
const longestStreakEl = document.getElementById('longestStreak');
const monthDaysEl = document.getElementById('monthDays');
const monthGoalEl = document.getElementById('monthGoal');
const monthSessionsEl = document.getElementById('monthSessions');
const monthMinutesEl = document.getElementById('monthMinutes');
const monthPercentEl = document.getElementById('monthPercent');
const goalRingProgress = document.getElementById('goalRingProgress');
const calendarTitle = document.getElementById('calendarTitle');
const calendarGrid = document.getElementById('calendarGrid');
const habitMessage = document.getElementById('habitMessage');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const exportBtn = document.getElementById('exportBtn');

const startBell = document.getElementById('startBell');
const endBell = document.getElementById('endBell');

const timerViews = [...document.querySelectorAll('.screen')];
const mobileTabs = [...document.querySelectorAll('.mobile-tab')];
const timerTabButton = document.getElementById('timerTabButton');
const habitTabButton = document.getElementById('habitTabButton');

const timerRadius = 102;
const timerCircumference = 2 * Math.PI * timerRadius;
const goalRadius = 35;
const goalCircumference = 2 * Math.PI * goalRadius;
ringProgress.style.strokeDasharray = timerCircumference;
goalRingProgress.style.strokeDasharray = goalCircumference;

let durationSeconds = DEFAULT_MINUTES * 60;
let remainingSeconds = durationSeconds;
let running = false;
let hasStarted = false;
let finishAt = null;
let timerId = null;
let wakeLock = null;
let audioUnlocked = false;
let audioContext = null;
let startBellBuffer = null;
let endBellBuffer = null;
let audioBuffersLoading = null;
let calendarCursor = new Date();
calendarCursor.setDate(1);

function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function loadSessions() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function recordCompletedSession(minutes) {
  const sessions = loadSessions();
  sessions.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    completedAt: new Date().toISOString(),
    localDate: dateKey(new Date()),
    minutes: Math.round(minutes)
  });
  saveSessions(sessions);
  calendarCursor = new Date();
  calendarCursor.setDate(1);
  renderHabitTracker();
}

function getDailyTotals(sessions) {
  return sessions.reduce((totals, session) => {
    const key = session.localDate || dateKey(new Date(session.completedAt));
    if (!totals[key]) totals[key] = { sessions: 0, minutes: 0 };
    totals[key].sessions += 1;
    totals[key].minutes += Number(session.minutes) || 0;
    return totals;
  }, {});
}

function calculateStreaks(dayKeys) {
  if (!dayKeys.length) return { current: 0, longest: 0 };

  const unique = [...new Set(dayKeys)].sort();
  const daySet = new Set(unique);
  let longest = 0;
  let run = 0;
  let previous = null;

  unique.forEach(key => {
    const current = parseDateKey(key);
    if (previous) {
      const diff = Math.round((current - previous) / 86400000);
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    previous = current;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  let cursor = daySet.has(dateKey(today))
    ? today
    : (daySet.has(dateKey(yesterday)) ? yesterday : null);
  let current = 0;

  while (cursor && daySet.has(dateKey(cursor))) {
    current += 1;
    const prior = new Date(cursor);
    prior.setDate(cursor.getDate() - 1);
    cursor = prior;
  }

  return { current, longest };
}

function renderHabitTracker() {
  const sessions = loadSessions();
  const totals = getDailyTotals(sessions);
  const keys = Object.keys(totals);
  const streaks = calculateStreaks(keys);

  currentStreakEl.textContent = streaks.current;
  longestStreakEl.textContent = streaks.longest;
  monthGoalEl.textContent = MONTH_GOAL_DAYS;

  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const monthKeys = keys.filter(key => key.startsWith(monthPrefix));
  const monthSessions = monthKeys.reduce((sum, key) => sum + totals[key].sessions, 0);
  const monthMinutes = monthKeys.reduce((sum, key) => sum + totals[key].minutes, 0);
  const progress = Math.min(1, monthKeys.length / MONTH_GOAL_DAYS);
  const progressPercent = Math.round(progress * 100);

  monthDaysEl.textContent = monthKeys.length;
  monthSessionsEl.textContent = monthSessions;
  monthMinutesEl.textContent = monthMinutes;
  monthPercentEl.textContent = `${progressPercent}%`;
  goalRingProgress.style.strokeDashoffset = goalCircumference * (1 - progress);

  calendarTitle.textContent = calendarCursor.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  calendarGrid.innerHTML = '';

  for (let i = 0; i < firstDay; i += 1) {
    const blank = document.createElement('div');
    blank.className = 'calendar-day empty';
    blank.setAttribute('aria-hidden', 'true');
    calendarGrid.appendChild(blank);
  }

  const todayKey = dateKey(new Date());
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const data = totals[key];
    const cell = document.createElement('div');
    cell.className = 'calendar-day';

    if (data) cell.classList.add('practiced');
    if (key === todayKey) cell.classList.add('today');

    const number = document.createElement('span');
    number.textContent = day;
    cell.appendChild(number);

    if (data) {
      const marker = document.createElement('span');
      marker.className = 'session-badge';
      cell.appendChild(marker);

      if (data.sessions > 1) {
        const count = document.createElement('span');
        count.className = 'session-count';
        count.textContent = data.sessions;
        cell.appendChild(count);
      }

      cell.title = `${data.sessions} session${data.sessions > 1 ? 's' : ''} · ${data.minutes} min`;
      cell.setAttribute('aria-label', `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}: ${data.sessions} session${data.sessions > 1 ? 's' : ''}, ${data.minutes} minutes`);
    } else {
      cell.setAttribute('aria-label', date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }));
    }

    calendarGrid.appendChild(cell);
  }

  if (sessions.length === 0) {
    habitMessage.textContent = 'Begin with one quiet session.';
  } else if (streaks.current >= 7) {
    habitMessage.textContent = `${streaks.current} quiet days in a row.`;
  } else if (streaks.current > 0) {
    habitMessage.textContent = `A gentle ${streaks.current}-day rhythm.`;
  } else {
    habitMessage.textContent = 'Return today. Begin again.';
  }
}

function updateDisplay() {
  timeDisplay.textContent = formatTime(remainingSeconds);
  const progress = durationSeconds > 0 ? remainingSeconds / durationSeconds : 0;
  ringProgress.style.strokeDashoffset = timerCircumference * (1 - progress);
  document.title = running ? `${formatTime(remainingSeconds)} · Still` : 'Still — Meditation Timer';
}

function updateDuration(minutes, isCustom = false) {
  if (hasStarted) return;
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return;
  durationSeconds = value * 60;
  remainingSeconds = durationSeconds;
  presetButtons.forEach(button => {
    button.classList.toggle('active', !isCustom && Number(button.dataset.minutes) === value);
  });
  if (customTimeBtn) customTimeBtn.classList.toggle('active', isCustom);
  updateDisplay();
}

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioContext = new AudioContextClass();
  }
  return audioContext;
}

async function loadBellBuffers() {
  const context = getAudioContext();
  if (!context) return false;
  if (startBellBuffer) return true;
  if (audioBuffersLoading) return audioBuffersLoading;

  // Still now uses one selected bowl sound for both start and finish.
  audioBuffersLoading = fetch('assets/start_bowl.wav', { cache: 'force-cache' })
    .then(response => {
      if (!response.ok) throw new Error(`Bell HTTP ${response.status}`);
      return response.arrayBuffer();
    })
    .then(data => context.decodeAudioData(data.slice(0)))
    .then(buffer => {
      startBellBuffer = buffer;
      endBellBuffer = buffer; // Same timbre at both ends of the session.
      return true;
    })
    .catch(error => {
      console.debug('Web Audio bell preload failed; HTML audio fallback remains available.', error);
      return false;
    })
    .finally(() => {
      audioBuffersLoading = null;
    });

  return audioBuffersLoading;
}

async function unlockAudio() {
  const context = getAudioContext();
  if (context) {
    try {
      if (context.state !== 'running') await context.resume();
      const silentBuffer = context.createBuffer(1, 1, context.sampleRate);
      const source = context.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(context.destination);
      source.start(0);
      await loadBellBuffers();
      audioUnlocked = context.state === 'running';
      if (audioUnlocked) return;
    } catch (error) {
      console.debug('Web Audio unlock was blocked; trying HTML audio fallback.', error);
    }
  }

  for (const audioEl of [startBell, endBell]) {
    try {
      audioEl.muted = true;
      audioEl.currentTime = 0;
      await audioEl.play();
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl.muted = false;
    } catch (error) {
      audioEl.muted = false;
      console.debug('HTML audio unlock was blocked by the browser.', error);
    }
  }
  audioUnlocked = true;
}

function scheduleWebAudioStrike(context, buffer, when, volume) {
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  source.playbackRate.value = 1.0; // Preserve the WAV's original pitch and speed.
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(context.destination);
  source.start(when);
}

async function playBell(kind, volume = 0.82) {
  const context = getAudioContext();
  const buffer = startBellBuffer;

  if (context && buffer) {
    try {
      if (context.state === 'suspended') await context.resume();
      if (context.state === 'running') {
        const now = context.currentTime + 0.03;
        scheduleWebAudioStrike(context, buffer, now, volume);

        // The ending bell uses the same bowl twice. Scheduling both strikes
        // in one AudioContext operation is more reliable on iPhone/iPad.
        if (kind === 'end') {
          scheduleWebAudioStrike(context, buffer, now + 3.0, volume);
        }
        return true;
      }
    } catch (error) {
      console.debug('Web Audio playback failed; trying HTML audio fallback.', error);
    }
  }

  // HTMLAudio fallback. Both audio elements point to the same selected sound.
  const audioEl = kind === 'end' ? endBell : startBell;
  try {
    audioEl.pause();
    audioEl.currentTime = 0;
    audioEl.volume = volume;
    audioEl.playbackRate = 1.0;
    await audioEl.play();

    if (kind === 'end') {
      window.setTimeout(() => {
        try {
          const secondStrike = startBell.cloneNode(true);
          secondStrike.volume = Math.max(0, Math.min(1, volume));
          secondStrike.playbackRate = 1.0;
          secondStrike.play().catch(() => {});
        } catch (error) {}
      }, 3000);
    }
    return true;
  } catch (error) {
    console.debug('Bell playback was blocked by the browser.', error);
    return false;
  }
}


async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch (error) {}
}

async function releaseWakeLock() {
  if (!wakeLock) return;
  try { await wakeLock.release(); } catch (error) {}
  wakeLock = null;
}

function tick() {
  if (!running || !finishAt) return;
  remainingSeconds = Math.max(0, (finishAt - Date.now()) / 1000);
  updateDisplay();
  if (remainingSeconds <= 0) finishSession();
}

async function beginOrResume() {
  await unlockAudio();
  if (!hasStarted) {
    hasStarted = true;
    remainingSeconds = durationSeconds;
    if (startBellToggle.checked) playBell('start', 0.84);
  }

  finishAt = Date.now() + remainingSeconds * 1000;
  running = true;
  document.body.classList.add('running');
  timerState.textContent = 'Breathe. Be here.';
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  resetBtn.disabled = false;
  presetButtons.forEach(button => button.disabled = true);
  if (customTimeBtn) customTimeBtn.disabled = true;
  requestWakeLock();

  clearInterval(timerId);
  timerId = setInterval(tick, 250);
  tick();
}

function pauseSession() {
  if (!running) return;
  running = false;
  clearInterval(timerId);
  timerId = null;
  if (finishAt) remainingSeconds = Math.max(0, (finishAt - Date.now()) / 1000);
  finishAt = null;
  document.body.classList.remove('running');
  timerState.textContent = 'Paused.';
  startBtn.disabled = false;
  startBtn.querySelector('.control-label').textContent = 'Resume';
  pauseBtn.disabled = true;
  releaseWakeLock();
  updateDisplay();
}

function resetSession() {
  running = false;
  hasStarted = false;
  clearInterval(timerId);
  timerId = null;
  finishAt = null;
  remainingSeconds = durationSeconds;
  document.body.classList.remove('running');
  timerState.textContent = 'Breathe. Be here.';
  startBtn.disabled = false;
  startBtn.querySelector('.control-label').textContent = 'Start';
  pauseBtn.disabled = true;
  resetBtn.disabled = true;
  presetButtons.forEach(button => button.disabled = false);
  if (customTimeBtn) customTimeBtn.disabled = false;
  releaseWakeLock();
  updateDisplay();
}

function finishSession() {
  const completedMinutes = durationSeconds / 60;
  running = false;
  hasStarted = false;
  clearInterval(timerId);
  timerId = null;
  finishAt = null;
  remainingSeconds = 0;
  document.body.classList.remove('running');
  timerState.textContent = 'Complete.';
  startBtn.disabled = false;
  startBtn.querySelector('.control-label').textContent = 'Again';
  pauseBtn.disabled = true;
  resetBtn.disabled = false;
  presetButtons.forEach(button => button.disabled = false);
  if (customTimeBtn) customTimeBtn.disabled = false;
  releaseWakeLock();
  updateDisplay();

  recordCompletedSession(completedMinutes);
  if (endBellToggle.checked) playBell('end', 0.82);
}

function exportData() {
  const sessions = loadSessions();
  const payload = {
    app: 'Still Meditation Timer',
    exportedAt: new Date().toISOString(),
    monthGoalDays: MONTH_GOAL_DAYS,
    sessions
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `still-meditation-backup-${dateKey(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function syncBellLabels() {
  const startLabel = startBellToggle.closest('.bell-setting').querySelector('.on-off');
  const endLabel = endBellToggle.closest('.bell-setting').querySelector('.on-off');
  startLabel.textContent = startBellToggle.checked ? 'ON' : 'OFF';
  endLabel.textContent = endBellToggle.checked ? 'ON' : 'OFF';
}

function showView(viewId) {
  if (window.matchMedia('(min-width: 981px)').matches) return;
  timerViews.forEach(view => view.classList.toggle('active-view', view.id === viewId));
  mobileTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.view === viewId));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

presetButtons.forEach(button => {
  button.addEventListener('click', () => {
    customTimePanel.hidden = true;
    updateDuration(button.dataset.minutes);
  });
});

customTimeBtn.addEventListener('click', () => {
  if (hasStarted) return;
  customTimePanel.hidden = !customTimePanel.hidden;
  if (!customTimePanel.hidden) customMinutes.focus();
});

customSetBtn.addEventListener('click', () => {
  const hours = Math.max(0, Math.min(23, Number(customHours.value) || 0));
  const minutes = Math.max(0, Math.min(59, Number(customMinutes.value) || 0));
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes < 1) {
    customMinutes.value = 1;
    return;
  }
  customHours.value = hours;
  customMinutes.value = minutes;
  updateDuration(totalMinutes, true);
  customTimePanel.hidden = true;
});

startBtn.addEventListener('click', () => {
  if (remainingSeconds <= 0) resetSession();
  beginOrResume();
});
pauseBtn.addEventListener('click', pauseSession);
resetBtn.addEventListener('click', resetSession);
soundTestBtn.addEventListener('click', async (event) => {
  await unlockAudio();
  // Normal tap tests the opening bell; Shift-click tests the ending bell on desktop.
  playBell(event.shiftKey ? 'end' : 'start', 0.74);
});

startBellToggle.addEventListener('change', syncBellLabels);
endBellToggle.addEventListener('change', syncBellLabels);

prevMonthBtn.addEventListener('click', () => {
  calendarCursor.setMonth(calendarCursor.getMonth() - 1);
  renderHabitTracker();
});
nextMonthBtn.addEventListener('click', () => {
  calendarCursor.setMonth(calendarCursor.getMonth() + 1);
  renderHabitTracker();
});
exportBtn.addEventListener('click', exportData);

mobileTabs.forEach(tab => tab.addEventListener('click', () => showView(tab.dataset.view)));
timerTabButton.addEventListener('click', () => showView('habitView'));
habitTabButton.addEventListener('click', () => showView('timerView'));

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const context = getAudioContext();
    if (context && context.state === 'suspended' && audioUnlocked) {
      context.resume().catch(() => {});
    }
    if (running) {
      requestWakeLock();
      tick();
    }
  }
});

window.addEventListener('resize', () => {
  if (window.matchMedia('(min-width: 981px)').matches) {
    timerViews.forEach(view => view.classList.remove('active-view'));
    document.getElementById('timerView').classList.add('active-view');
  }
});

syncBellLabels();
updateDuration(DEFAULT_MINUTES);
renderHabitTracker();
