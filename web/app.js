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
  K: 20
};

const exerciseLabels = {
  腕立て伏せ: '腕立て',
  スクワット: 'スクワット',
  バーピー: 'バーピー',
  腹筋: '腹筋'
};

const exerciseTips = {
  腕立て伏せ: '胸を張って体を一直線に保とう！ブラザー！！',
  スクワット: '膝とつま先を同じ向きにそろえて踏み込め！ブラザー！！',
  バーピー: '全身を大きく使って爆発的に跳べ！ブラザー！！',
  腹筋: '呼吸を刻んでゆっくり締めろ！ブラザー！！'
};

const totalsInitial = () => ({ 腕立て伏せ: 0, スクワット: 0, バーピー: 0, 腹筋: 0 });

const state = {
  deck: [],
  totals: totalsInitial(),
  history: []
};

const elements = {
  draw: document.getElementById('btn-draw'),
  drawMobile: document.getElementById('btn-draw-mobile'),
  summary: document.getElementById('btn-summary'),
  reset: document.getElementById('btn-reset'),
  card: document.getElementById('card-display'),
  progressBar: document.getElementById('progress-bar'),
  progressText: document.getElementById('progress-text'),
  totalsList: document.getElementById('totals-list'),
  logList: document.getElementById('log-list'),
  summaryDialog: document.getElementById('summary-dialog'),
  summaryContent: document.getElementById('summary-content')
};

init();

function init() {
  resetState();
  elements.draw.addEventListener('click', onDraw);
  elements.drawMobile.addEventListener('click', onDraw);
  elements.reset.addEventListener('click', () => {
    resetState();
    renderCardPlaceholder();
  });
  elements.summary.addEventListener('click', openSummary);
  window.addEventListener('keydown', handleShortcuts);
  if (!('showModal' in elements.summaryDialog)) {
    // graceful fallback
    elements.summaryDialog.setAttribute('open', 'open');
    elements.summaryDialog.classList.add('summary--inline');
  }
}

function resetState() {
  state.deck = buildDeck();
  shuffle(state.deck);
  state.totals = totalsInitial();
  state.history = [];
  updateProgress();
  updateTotals();
  elements.logList.innerHTML = '';
  elements.draw.disabled = false;
  elements.drawMobile.disabled = false;
}

function handleShortcuts(event) {
  const activeTag = document.activeElement?.tagName?.toLowerCase();
  if (activeTag === 'input' || activeTag === 'textarea') return;

  if (event.key === 'Enter') {
    event.preventDefault();
    onDraw();
  } else if (event.key.toLowerCase() === 's') {
    event.preventDefault();
    openSummary();
  } else if (event.key.toLowerCase() === 'r') {
    event.preventDefault();
    resetState();
    renderCardPlaceholder();
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
  renderCard(card);
  updateTotals();
  updateProgress();
  addLogEntry(card);
  if (state.deck.length === 0) {
    elements.draw.textContent = 'コンプリート！';
    elements.drawMobile.textContent = 'コンプリート！';
    elements.draw.disabled = true;
    elements.drawMobile.disabled = true;
  }
}

function renderCard(card) {
  elements.card.classList.remove('card--empty');
  const shortName = exerciseLabels[card.exercise] ?? card.exercise;
  const tip = exerciseTips[card.exercise];
  elements.card.innerHTML = `
    <div class="card__header">
      <span class="card__suit ${card.toneClass}">${card.glyph}</span>
      <div class="card__rank">${card.rank}</div>
    </div>
    <div class="card__body">
      <div class="card__exercise">${shortName}</div>
      <p class="card__value">${card.value} 回</p>
      ${renderHint(card, tip)}
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
      <p>ビートに乗せて「カードを引く」をキメよう！ブラザー！！</p>
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
    elements.summaryDialog.showModal();
  }
}

function renderHint(card, defaultHint) {
  if (card.rank === 'K') {
    return `
      <p class="card__shout">ウィィィー！！！</p>
      <p class="card__hint">Kのカードはボーナスで20回実施だぜ！最高だな！ブラザー！！</p>
    `;
  }

  return defaultHint ? `<p class="card__hint">${defaultHint}</p>` : '';
}
