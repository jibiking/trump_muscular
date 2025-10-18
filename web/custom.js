const SETTINGS_KEY = 'trump-muscular:session-settings';
const form = document.getElementById('custom-form');

restorePreviousSelection();

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const max = Number(data.get('max'));
  if (!max || Number.isNaN(max)) {
    alert('最大レップを選択してくれブラザー！');
    return;
  }
  const settings = {
    mode: 'custom',
    maxValue: max,
    timestamp: Date.now()
  };
  sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.location.href = 'training.html';
});

function restorePreviousSelection() {
  if (!form) return;
  try {
    const raw = sessionStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const settings = JSON.parse(raw);
    if (settings?.mode !== 'custom') return;
    const input = form.elements.namedItem('max');
    if (!input) return;
    const radio = form.querySelector(`input[name="max"][value="${settings.maxValue}"]`);
    if (radio) {
      radio.checked = true;
    }
  } catch (error) {
    console.warn('カスタム設定の復元に失敗', error);
  }
}
