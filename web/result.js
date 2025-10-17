const RESULT_STORAGE_KEY = 'trump-muscular:last-result';

const messageEl = document.getElementById('result-message');
const summaryEl = document.getElementById('result-summary');
const totalsEl = document.getElementById('result-totals');
const historyEl = document.getElementById('result-history');

let snapshot = null;
try {
  const raw = sessionStorage.getItem(RESULT_STORAGE_KEY);
  if (raw) {
    snapshot = JSON.parse(raw);
  }
} catch (error) {
  console.error('リザルトデータの読み込みに失敗しました', error);
}

if (!snapshot || !Array.isArray(snapshot.history) || snapshot.history.length === 0) {
  messageEl.textContent = '最新のセッション結果が見つかりません。新たなセッションで燃え上がろう！';
  summaryEl.innerHTML = '';
  totalsEl.innerHTML = '';
  historyEl.innerHTML = '';
} else {
  renderSummary(snapshot);
  renderTotals(snapshot);
  renderHistory(snapshot);
}

function renderSummary(data) {
  const completedAt = formatDate(data.completedAt);
  const duration = formatDuration(data.durationSeconds ?? 0);
  const totalReps = data.totalReps ?? 0;
  const draws = data.draws ?? data.history.length;
  const startAt = data.startedAt ? formatDate(data.startedAt) : null;
  const completedLabel = completedAt ?? 'ついさっき';

  messageEl.innerHTML = `デッキを制覇したナイスフロウ！${completedLabel}にセッション完了、クラブビートがまだ鳴り止まないぜブラザー！！`;

  summaryEl.innerHTML = `
    <div class="result-metric">
      <span class="result-metric__label">総レップ</span>
      <strong class="result-metric__value">${totalReps}</strong>
    </div>
    <div class="result-metric">
      <span class="result-metric__label">ドロー枚数</span>
      <strong class="result-metric__value">${draws}</strong>
    </div>
    <div class="result-metric">
      <span class="result-metric__label">所要時間</span>
      <strong class="result-metric__value">${duration}</strong>
    </div>
    <div class="result-metric">
      <span class="result-metric__label">開始時刻</span>
      <strong class="result-metric__value">${startAt ?? '---'}</strong>
    </div>
  `;
}

function renderTotals(data) {
  const totals = data.totals ?? {};
  const entries = Object.entries(totals);
  if (entries.length === 0) {
    totalsEl.innerHTML = '';
    return;
  }
  totalsEl.innerHTML = `
    <h2>種目別トータル</h2>
    <ul class="result-totals__list">
      ${entries
        .map(
          ([exercise, count]) => `
            <li>
              <span>${exercise}</span>
              <strong>${count} 回</strong>
            </li>
          `
        )
        .join('')}
    </ul>
  `;
}

function renderHistory(data) {
  const items = data.history;
  if (!items.length) {
    historyEl.innerHTML = '';
    return;
  }
  historyEl.innerHTML = `
    <h2>ドローログ</h2>
    <ol class="result-history__list">
      ${items
        .map(
          (item) => `
            <li>
              <span class="result-history__badge">${item.glyph} ${item.rank}</span>
              <div>
                <p class="result-history__exercise">${item.exercise} ${item.value} 回</p>
                <p class="result-history__suit">${item.order}枚目・${item.suit}</p>
              </div>
            </li>
          `
        )
        .join('')}
    </ol>
  `;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${minutes}分${remain.toString().padStart(2, '0')}秒`;
}

function formatDate(timestamp) {
  if (!timestamp) return null;
  try {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  } catch (error) {
    return null;
  }
}
