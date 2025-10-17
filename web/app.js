const suits = [
  { key: 'spade', name: 'スペード', glyph: '♠', exercise: '腕立て伏せ', fill: '♠', toneClass: 'tone-spade' },
  { key: 'heart', name: 'ハート', glyph: '♥', exercise: 'スクワット', fill: '♥', toneClass: 'tone-heart' },
  { key: 'diamond', name: 'ダイヤ', glyph: '♦', exercise: '腹筋', fill: '♦', toneClass: 'tone-diamond' },
  { key: 'club', name: 'クラブ', glyph: '♣', exercise: 'バーピー', fill: '♣', toneClass: 'tone-club' }
];

const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const valueByRank = {
  A: 1,
  J: 11,
  Q: 12,
  K: 22
};

const exerciseLabels = {
  腕立て伏せ: '腕立て',
  スクワット: 'スクワット',
  バーピー: 'バーピー',
  腹筋: '腹筋'
};

const exerciseTips = {
  腕立て伏せ: '胸張って体幹ロック、肘絞り押し込むフロアでノック',
  スクワット: 'かかと踏みしめリズムでドロップ、腰落とし弾き返せステージトップ',
  バーピー: 'しゃがんで跳ねる爆裂ダッシュ、胸まで戻って全身スプラッシュ',
  腹筋: '背中を寝かせてコアをクラッチ、呼吸で刻んで芯までキャッチ'
};

const totalsInitial = () => ({ 腕立て伏せ: 0, スクワット: 0, バーピー: 0, 腹筋: 0 });

const RESULT_STORAGE_KEY = 'trump-muscular:last-result';
const AUTO_RESULT_DELAY_MS = 600;
const isTrainingPage = document.body?.dataset.page === 'training';

const state = {
  deck: [],
  totals: totalsInitial(),
  history: [],
  startedAt: null,
  sessionStarted: false,
  navigateScheduled: false
};

const timers = {
  totalInterval: null,
  countdownInterval: null,
  countdownRemaining: 0
};

const pauseState = {
  countdownRemaining: null,
  wasSoundPlaying: false,
  spectrumRunning: false
};

let summaryPaused = false;

const changeSound = (() => {
  if (!isTrainingPage || typeof Audio === 'undefined') return null;
  const audio = new Audio('change.mp3');
  audio.preload = 'auto';
  audio.volume = 0.7;
  return audio;
})();

const elements = {
  draw: document.getElementById('btn-draw'),
  drawMobile: document.getElementById('btn-draw-mobile'),
  summary: document.getElementById('btn-summary'),
  card: document.getElementById('card-display'),
  progressBar: document.getElementById('progress-bar'),
  progressText: document.getElementById('progress-text'),
  totalsList: document.getElementById('totals-list'),
  logList: document.getElementById('log-list'),
  summaryDialog: document.getElementById('summary-dialog'),
  summaryContent: document.getElementById('summary-content'),
  soundToggle: document.getElementById('sound-toggle'),
  audio: document.getElementById('bg-music'),
  spectrumCanvas: document.getElementById('spectrum-canvas'),
  result: document.getElementById('btn-result'),
  resultMobile: document.getElementById('btn-result-mobile'),
  totalTimeDisplay: document.getElementById('total-time'),
  countdownDisplay: document.getElementById('countdown-timer')
};

const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext || null;

const audioState = {
  context: null,
  analyser: null,
  source: null,
  animationId: null,
  dataArray: null
};

const spectrumState = {
  canvas: elements.spectrumCanvas,
  ctx: null,
  width: 0,
  height: 0,
  gradient: null,
  barCount: 80
};

let musicReady = false;
let soundMuted = !isTrainingPage;
let desiredSoundMuted = !isTrainingPage;

if (isTrainingPage) {
  init();
}

function init() {
  resetState();
  elements.draw?.addEventListener('click', onDraw);
  elements.drawMobile?.addEventListener('click', onDraw);
  elements.summary?.addEventListener('click', openSummary);
  window.addEventListener('keydown', handleShortcuts);
  if (elements.soundToggle) {
    elements.soundToggle.addEventListener('click', toggleSound);
  }
  if (elements.result) {
    elements.result.addEventListener('click', () => {
      if (state.deck.length === 0) {
        navigateToResult();
      }
    });
  }
  if (elements.resultMobile) {
    elements.resultMobile.addEventListener('click', () => {
      if (state.deck.length === 0) {
        navigateToResult();
      }
    });
  }
  setupSpectrumCanvas();
  prepareAudio();
  updateSoundToggleLabel();
  if (elements.summaryDialog && !('showModal' in elements.summaryDialog)) {
    // graceful fallback
    elements.summaryDialog.setAttribute('open', 'open');
    elements.summaryDialog.classList.add('summary--inline');
  }
  setTimeout(autoStartSession, 120);
}

function toggleSound() {
  desiredSoundMuted = !desiredSoundMuted;
  if (!musicReady) {
    updateSoundToggleLabel();
    return;
  }
  void applySoundState();
}

function updateSoundToggleLabel() {
  if (!elements.soundToggle) return;
  if (!elements.audio) {
    elements.soundToggle.textContent = 'サウンド未対応';
    elements.soundToggle.disabled = true;
    elements.soundToggle.removeAttribute('data-status');
    elements.soundToggle.removeAttribute('title');
    elements.soundToggle.setAttribute('aria-pressed', 'false');
    return;
  }
  const muted = musicReady ? soundMuted : desiredSoundMuted;
  elements.soundToggle.textContent = muted ? '音を解放！' : 'サウンド停止';
  if (!musicReady) {
    elements.soundToggle.dataset.status = 'loading';
    elements.soundToggle.title = '音源読み込み中です';
  } else {
    elements.soundToggle.removeAttribute('data-status');
    elements.soundToggle.removeAttribute('title');
  }
  elements.soundToggle.disabled = false;
  elements.soundToggle.setAttribute('aria-pressed', String(!muted));
  elements.soundToggle.dataset.state = muted ? 'off' : 'on';
}

function prepareAudio() {
  if (!elements.audio) {
    musicReady = false;
    return;
  }

  elements.audio.volume = 0.65;
  elements.audio.loop = true;
  elements.audio.playbackRate = 1.2;

  const markReady = () => {
    if (musicReady) return;
    musicReady = true;
    updateSoundToggleLabel();
    if (!desiredSoundMuted) {
      void applySoundState();
    }
  };

  if (elements.audio.readyState >= 2) {
    markReady();
  } else {
    elements.audio.addEventListener('canplay', markReady, { once: true });
    elements.audio.addEventListener('loadeddata', markReady, { once: true });
  }
}

function setupSpectrumCanvas() {
  if (!spectrumState.canvas) return;
  const ctx = spectrumState.canvas.getContext('2d');
  if (!ctx) return;
  spectrumState.ctx = ctx;
  updateSpectrumDimensions();
  window.addEventListener('resize', updateSpectrumDimensions);
}

function updateSpectrumDimensions() {
  if (!spectrumState.canvas || !spectrumState.ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const { canvas, ctx } = spectrumState;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  spectrumState.width = width;
  spectrumState.height = height;
  spectrumState.gradient = ctx.createLinearGradient(0, height, width, 0);
  spectrumState.gradient.addColorStop(0, 'rgba(255, 75, 160, 0.28)');
  spectrumState.gradient.addColorStop(0.2, 'rgba(255, 210, 70, 0.32)');
  spectrumState.gradient.addColorStop(0.4, 'rgba(80, 240, 255, 0.35)');
  spectrumState.gradient.addColorStop(0.6, 'rgba(120, 90, 255, 0.36)');
  spectrumState.gradient.addColorStop(0.8, 'rgba(255, 70, 200, 0.32)');
  spectrumState.gradient.addColorStop(1, 'rgba(255, 255, 255, 0.26)');
  primeSpectrumCanvas();
}

function primeSpectrumCanvas() {
  if (!spectrumState.ctx) return;
  spectrumState.ctx.fillStyle = 'rgba(5, 0, 26, 0.9)';
  spectrumState.ctx.fillRect(0, 0, spectrumState.width, spectrumState.height);
  if (spectrumState.gradient) {
    spectrumState.ctx.save();
    spectrumState.ctx.globalCompositeOperation = 'screen';
    spectrumState.ctx.fillStyle = spectrumState.gradient;
    spectrumState.ctx.fillRect(0, 0, spectrumState.width, spectrumState.height);
    spectrumState.ctx.restore();
  }
}

function ensureAudioGraph() {
  if (!elements.audio) return;
  if (audioState.source || !AudioContextClass) return;

  audioState.context = new AudioContextClass();
  audioState.analyser = audioState.context.createAnalyser();
  audioState.analyser.fftSize = 512;
  audioState.analyser.smoothingTimeConstant = 0.78;

  audioState.source = audioState.context.createMediaElementSource(elements.audio);
  audioState.source.connect(audioState.analyser);
  audioState.analyser.connect(audioState.context.destination);
  audioState.dataArray = new Uint8Array(audioState.analyser.frequencyBinCount);
}

function ensureAudioContextRunning() {
  if (!audioState.context) return Promise.resolve();
  if (audioState.context.state === 'suspended') {
    return audioState.context.resume();
  }
  return Promise.resolve();
}

function startSpectrumAnimation() {
  if (!audioState.analyser || !spectrumState.ctx) return;
  if (!audioState.dataArray || audioState.dataArray.length !== audioState.analyser.frequencyBinCount) {
    audioState.dataArray = new Uint8Array(audioState.analyser.frequencyBinCount);
  }
  if (audioState.animationId) return;

  const render = () => {
    drawSpectrumFrame();
    audioState.animationId = requestAnimationFrame(render);
  };

  render();
}

function stopSpectrumAnimation(clear = false) {
  if (audioState.animationId) {
    cancelAnimationFrame(audioState.animationId);
    audioState.animationId = null;
  }
  if (clear) {
    primeSpectrumCanvas();
  }
}

function drawSpectrumFrame() {
  if (!audioState.analyser || !audioState.dataArray || !spectrumState.ctx) return;
  const { ctx, width, height, gradient, barCount } = spectrumState;
  if (!width || !height) return;

  audioState.analyser.getByteFrequencyData(audioState.dataArray);

  ctx.fillStyle = 'rgba(5, 0, 26, 0.25)';
  ctx.fillRect(0, 0, width, height);

  const halfBars = Math.floor(barCount / 2);
  const step = Math.max(1, Math.floor(audioState.dataArray.length / halfBars));
  const barWidth = Math.max(2, width / (barCount * 1.8));
  const gap = barWidth * 0.45;
  const centerX = width / 2;
  const baseY = height * 0.6;
  const maxBarHeight = height * 0.55;

  if (gradient) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  const time = performance.now();
  const hueBase = (time / 35) % 360;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < halfBars; i += 1) {
    const dataIndex = Math.min(audioState.dataArray.length - 1, i * step);
    const magnitude = audioState.dataArray[dataIndex] / 255;
    const barHeight = Math.max(10, magnitude * maxBarHeight);
    const offset = i * (barWidth + gap);
    const leftX = centerX - offset - barWidth;
    const rightX = centerX + offset;

    const hue = (hueBase + i * 7) % 360;
    const saturation = 70 + magnitude * 28;
    const lightnessBottom = 42 + magnitude * 28;
    const lightnessTop = Math.min(88, lightnessBottom + 18);
    const alpha = 0.55 + magnitude * 0.35;

    const gradientBottom = `hsla(${hue.toFixed(1)}, ${Math.min(100, saturation + 10).toFixed(1)}%, ${Math.min(75, lightnessBottom).toFixed(1)}%, ${(alpha * 0.85).toFixed(2)})`;
    const gradientMid = `hsla(${(hue + 32) % 360}, ${Math.min(100, saturation + 24).toFixed(1)}%, ${Math.min(82, lightnessTop).toFixed(1)}%, ${alpha.toFixed(2)})`;
    const gradientTop = `hsla(${(hue + 58) % 360}, ${Math.min(100, saturation + 32).toFixed(1)}%, ${Math.min(90, lightnessTop + 6).toFixed(1)}%, ${(alpha * 0.9).toFixed(2)})`;

    const barGradient = ctx.createLinearGradient(leftX, baseY + barHeight, leftX, baseY - barHeight);
    barGradient.addColorStop(0, gradientBottom);
    barGradient.addColorStop(0.45, gradientMid);
    barGradient.addColorStop(1, gradientTop);

    ctx.shadowColor = `hsla(${(hue + 12) % 360}, 95%, 70%, ${(0.28 + magnitude * 0.4).toFixed(2)})`;
    ctx.shadowBlur = 14 + magnitude * 28;
    ctx.fillStyle = barGradient;

    ctx.fillRect(leftX, baseY - barHeight, barWidth, barHeight * 2);
    ctx.fillRect(rightX, baseY - barHeight, barWidth, barHeight * 2);
  }
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillRect(0, baseY, width, 1.5);
}

function resetState() {
  state.deck = buildDeck();
  shuffle(state.deck);
  state.totals = totalsInitial();
  state.history = [];
  state.startedAt = null;
  state.sessionStarted = false;
  state.navigateScheduled = false;
  summaryPaused = false;
  pauseState.countdownRemaining = null;
  pauseState.wasSoundPlaying = false;
  pauseState.spectrumRunning = false;
  updateProgress();
  updateTotals();
  elements.logList.innerHTML = '';
  elements.draw.disabled = false;
  elements.drawMobile.disabled = false;
  sessionStorage.removeItem(RESULT_STORAGE_KEY);
  setResultButtonsEnabled(false);
  resetTimers();
  renderCardPlaceholder();
  updateSessionControls();
}

function handleShortcuts(event) {
  const activeTag = document.activeElement?.tagName?.toLowerCase();
  if (activeTag === 'input' || activeTag === 'textarea') return;

  if (event.key === 'Enter') {
    event.preventDefault();
    onDraw();
  } else if (event.key.toLowerCase() === 's') {
    event.preventDefault();
    if (state.deck.length === 0) return;
    openSummary();
  }
}

function buildDeck() {
  const deck = [];
  const now = Date.now();
  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      const value = valueByRank[rank] ?? Number(rank);
      deck.push({
        ...suit,
        rank,
        value,
        id: `${suit.key}-${rank}-${now}`
      });
    });
  });
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function onDraw() {
  if (state.deck.length === 0) return;
  const card = state.deck.pop();
  state.history.push(card);
  state.totals[card.exercise] += card.value;
  startSessionIfNeeded();
  renderCard(card);
  updateTotals();
  updateProgress();
  addLogEntry(card);
  playChangeSound();
  startCardCountdown(card);
  if (state.deck.length > 0) {
    updateSessionControls();
  }
  if (state.deck.length === 0) {
    elements.draw.textContent = 'コンプリート！';
    elements.drawMobile.textContent = 'コンプリート！';
    elements.draw.disabled = true;
    elements.drawMobile.disabled = true;
    setResultButtonsEnabled(true);
    updateCountdownDisplay(0);
    stopCountdown();
    updateTotalTimeDisplay(getElapsedSeconds());
    stopTotalTimer();
    persistResultSnapshot();
    scheduleNavigateToResult();
  }
}

function renderCard(card) {
  elements.card.classList.remove('card--empty');
  const shortName = exerciseLabels[card.exercise] ?? card.exercise;
  const guidance = buildGuidance(card);
  elements.card.innerHTML = `
    <div class="card__header">
      <span class="card__suit ${card.toneClass}">${card.glyph}</span>
      <div class="card__rank">${card.rank}</div>
    </div>
    <div class="card__body">
      <div class="card__exercise">${shortName}</div>
      <p class="card__value">${card.value} 回</p>
      ${guidance}
    </div>
    <div class="card__footer">
      <span>累計 ${state.totals[card.exercise]} 回</span>
      <span>残り ${state.deck.length} 枚</span>
    </div>
  `;

  elements.draw.textContent = '次のカード';
  elements.drawMobile.textContent = '次のカード';
}

function renderCardPlaceholder() {
  elements.card.classList.add('card--empty');
  elements.card.innerHTML = `
    <div class="card__placeholder">
      <span class="card__placeholder-icon">🃏</span>
      <p>ドローでスタート、リズムでハート！燃やせ筋肉エンジン全開アート！ブラザー！！</p>
    </div>
  `;
  elements.draw.textContent = 'カードを引く';
  elements.drawMobile.textContent = 'カードを引く';
}

function updateTotals() {
  elements.totalsList.innerHTML = '';
  Object.entries(state.totals).forEach(([exercise, count]) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${exercise}</span><strong>${count}</strong>`;
    elements.totalsList.appendChild(li);
  });
}

function updateProgress() {
  const drawn = state.history.length;
  const total = 52;
  const percent = Math.round((drawn / total) * 100);
  elements.progressBar.style.width = `${percent}%`;
  elements.progressText.textContent = `${drawn} / ${total} 枚`;
}

function addLogEntry(card) {
  const li = document.createElement('li');
  li.className = 'log__item';
  li.innerHTML = `<span>${card.glyph} ${card.rank}</span><span>${card.exercise} ${card.value}回</span>`;
  elements.logList.prepend(li);
}

function openSummary() {
  const drawn = state.history.length;
  const total = 52;
  const remain = state.deck.length;
  const suitRemain = suits.map((suit) => {
    const remaining = state.deck.filter((card) => card.key === suit.key).length;
    return `<li>${suit.name}：${remaining}枚</li>`;
  });

  elements.summaryContent.innerHTML = `
    <p>引いた枚数：${drawn}枚 / 残り：${remain}枚</p>
    <h3>累計回数</h3>
    <ul class="summary__totals">
      ${Object.entries(state.totals)
        .map(([exercise, count]) => `<li><span>${exercise}</span><strong>${count}回</strong></li>`)
        .join('')}
    </ul>
    <h3>残りカード（スート別）</h3>
    <ul>${suitRemain.join('')}</ul>
  `;

  if ('showModal' in elements.summaryDialog) {
    pauseSessionForSummary();
    elements.summaryDialog.showModal();
    elements.summaryDialog.addEventListener('close', resumeSessionFromSummary, { once: true });
  }
}

function getHypeLine(card) {
  if (card.rank === 'K') {
    return 'ウィィィー！！！キングで22回コンボフィーバー、クラブビート合わせて筋肉リーダー！ブラザー！！';
  }

  const hypePool = [
    'ビートに乗って全力アップロード、粘り切って限界ブレイクモード！ブラザー！！',
    'ステップ刻んでフロアにライドオン、汗が光ってテンションハイゾーン！ブラザー！！',
    'コアを締めて呼吸はディープゾーン、フォーム決めれば勝利はマイゾーン！ブラザー！！',
    '仲間の声援フレイムでファイヤーオン、最後の一回ブチ抜けチャンピオン！ブラザー！！'
  ];
  return hypePool[(card.value + card.rank.charCodeAt(0)) % hypePool.length];
}

function buildGuidance(card) {
  const hype = getHypeLine(card);

  if (card.rank === 'K') {
    return `<p class="card__flow card__flow--lead">${hype}</p>`;
  }

  const tip = exerciseTips[card.exercise];
  return `<p class="card__flow card__flow--lead">${tip}！${hype}</p>`;
}

async function applySoundState() {
  if (!elements.audio) {
    updateSoundToggleLabel();
    return;
  }

  if (!musicReady) {
    updateSoundToggleLabel();
    return;
  }

  if (desiredSoundMuted) {
    elements.audio.pause();
    soundMuted = true;
    stopSpectrumAnimation(true);
    updateSoundToggleLabel();
    return;
  }

  try {
    ensureAudioGraph();
    const resumePromise = ensureAudioContextRunning();
    const playPromise = elements.audio.play();
    const normalizedPlayPromise = playPromise instanceof Promise ? playPromise : Promise.resolve();
    elements.audio.playbackRate = 1.2;
    await Promise.all([resumePromise, normalizedPlayPromise]);
    soundMuted = false;
    startSpectrumAnimation();
  } catch (error) {
    console.error('音声の再生に失敗しました', error);
    desiredSoundMuted = true;
    soundMuted = true;
    stopSpectrumAnimation(true);
  }

  updateSoundToggleLabel();
}

function autoStartSession() {
  if (!isTrainingPage) return;
  if (state.history.length > 0 || state.sessionStarted) return;
  if (state.deck.length === 0) return;
  desiredSoundMuted = false;
  updateSoundToggleLabel();
  void applySoundState();
  onDraw();
}

function startSessionIfNeeded() {
  if (state.sessionStarted) return;
  state.sessionStarted = true;
  state.startedAt = Date.now();
  updateTotalTimeDisplay(0);
  startTotalTimer();
}

function startTotalTimer() {
  if (!isTrainingPage || !state.startedAt) return;
  stopTotalTimer();
  updateTotalTimeDisplay(getElapsedSeconds());
  timers.totalInterval = setInterval(() => {
    updateTotalTimeDisplay(getElapsedSeconds());
  }, 1000);
}

function stopTotalTimer() {
  if (timers.totalInterval) {
    clearInterval(timers.totalInterval);
    timers.totalInterval = null;
  }
}

function getElapsedSeconds() {
  if (!state.startedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
}

function resetTimers() {
  stopTotalTimer();
  stopCountdown(true);
  timers.countdownRemaining = 0;
  updateTotalTimeDisplay(0);
}

function updateTotalTimeDisplay(totalSeconds) {
  if (!elements.totalTimeDisplay) return;
  elements.totalTimeDisplay.textContent = formatSeconds(totalSeconds ?? 0);
}

function startCardCountdown(card) {
  if (!elements.countdownDisplay) return;
  pauseCountdown();
  timers.countdownRemaining = (card?.value ?? 0) + 10;
  updateCountdownDisplay(timers.countdownRemaining);
  startCountdownTicker();
}

function startCountdownTicker() {
  if (timers.countdownRemaining <= 0) {
    if (state.deck.length > 0) {
      onDraw();
    } else {
      scheduleNavigateToResult();
    }
    return;
  }
  pauseCountdown();
  const intervalId = setInterval(() => {
    if (timers.countdownInterval !== intervalId) {
      clearInterval(intervalId);
      return;
    }
    timers.countdownRemaining -= 1;
    if (timers.countdownRemaining <= 0) {
      updateCountdownDisplay(0);
      pauseCountdown();
      timers.countdownRemaining = 0;
      if (state.deck.length > 0) {
        onDraw();
      } else {
        scheduleNavigateToResult();
      }
    } else {
      updateCountdownDisplay(timers.countdownRemaining);
    }
  }, 1000);
  timers.countdownInterval = intervalId;
}

function pauseCountdown() {
  if (timers.countdownInterval) {
    clearInterval(timers.countdownInterval);
    timers.countdownInterval = null;
  }
}

function resumeCountdown() {
  if (timers.countdownRemaining > 0) {
    startCountdownTicker();
  }
}

function stopCountdown(clear = false) {
  pauseCountdown();
  timers.countdownRemaining = 0;
  if (clear) {
    updateCountdownDisplay(null);
  }
}

function updateCountdownDisplay(seconds) {
  if (!elements.countdownDisplay) return;
  if (seconds === null || seconds === undefined) {
    elements.countdownDisplay.textContent = '--:--';
    return;
  }
  elements.countdownDisplay.textContent = formatSeconds(seconds);
}

function formatSeconds(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`;
}

function scheduleNavigateToResult() {
  if (state.navigateScheduled) return;
  state.navigateScheduled = true;
  setTimeout(() => {
    navigateToResult();
  }, AUTO_RESULT_DELAY_MS);
}

function playChangeSound() {
  if (!changeSound) return;
  try {
    changeSound.currentTime = 0;
    const playPromise = changeSound.play();
    if (playPromise instanceof Promise) {
      playPromise.catch(() => {
        /* ignore autoplay restrictions */
      });
    }
  } catch (error) {
    // ignore playback errors
  }
}

function navigateToResult() {
  state.navigateScheduled = true;
  try {
    elements.audio?.pause();
  } catch (error) {
    // no-op
  }
  persistResultSnapshot();
  window.location.href = 'result.html';
}

function persistResultSnapshot() {
  if (state.history.length === 0) return;
  const now = Date.now();
  const startedAt = state.startedAt ?? now;
  const durationSeconds = state.startedAt ? Math.max(0, Math.round((now - state.startedAt) / 1000)) : 0;
  const snapshot = {
    version: 1,
    completedAt: now,
    startedAt,
    durationSeconds,
    totals: { ...state.totals },
    history: state.history.map((card, index) => ({
      order: index + 1,
      key: card.key,
      suit: card.name,
      glyph: card.glyph,
      rank: card.rank,
      value: card.value,
      exercise: card.exercise
    })),
    draws: state.history.length,
    totalReps: Object.values(state.totals).reduce((sum, count) => sum + count, 0)
  };
  sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(snapshot));
}

function setResultButtonsEnabled(enabled) {
  [elements.result, elements.resultMobile].forEach((btn) => {
    if (!btn) return;
    btn.disabled = !enabled;
    btn.classList.toggle('btn-result--ready', enabled);
  });
  updateSessionControls();
}

function updateSessionControls() {
  const finished = state.deck.length === 0;
  if (elements.summary) {
    elements.summary.classList.toggle('is-hidden', finished);
  }
  if (elements.result) {
    elements.result.classList.toggle('is-hidden', !finished);
  }
  if (elements.resultMobile) {
    elements.resultMobile.classList.toggle('is-hidden', !finished);
  }
}

function pauseSessionForSummary() {
  if (!isTrainingPage || summaryPaused) return;
  summaryPaused = true;
  pauseState.countdownRemaining = timers.countdownRemaining;
  pauseState.wasSoundPlaying = !desiredSoundMuted && !soundMuted && elements.audio && !elements.audio.paused;
  pauseState.spectrumRunning = Boolean(audioState.animationId);
  pauseCountdown();
  stopTotalTimer();
  if (pauseState.wasSoundPlaying && elements.audio) {
    try {
      elements.audio.pause();
      soundMuted = true;
    } catch (error) {
      /* ignore */
    }
  }
  if (pauseState.spectrumRunning) {
    stopSpectrumAnimation();
  }
  updateSoundToggleLabel();
}

function resumeSessionFromSummary() {
  if (!isTrainingPage || !summaryPaused) return;
  summaryPaused = false;
  if (state.sessionStarted && state.deck.length > 0) {
    startTotalTimer();
  }
  if (pauseState.countdownRemaining && pauseState.countdownRemaining > 0 && state.deck.length > 0) {
    timers.countdownRemaining = pauseState.countdownRemaining;
    updateCountdownDisplay(timers.countdownRemaining);
    resumeCountdown();
  }
  pauseState.countdownRemaining = null;
  if (pauseState.wasSoundPlaying) {
    desiredSoundMuted = false;
    soundMuted = true;
    void applySoundState();
    if (pauseState.spectrumRunning) {
      startSpectrumAnimation();
    }
  } else if (pauseState.spectrumRunning && !desiredSoundMuted) {
    startSpectrumAnimation();
  }
  pauseState.wasSoundPlaying = false;
  pauseState.spectrumRunning = false;
  updateSoundToggleLabel();
}
