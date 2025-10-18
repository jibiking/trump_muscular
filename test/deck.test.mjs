import assert from 'node:assert/strict';
import { buildDeck, suits, VALID_CUSTOM_MAX, valueByRank, ranks } from '../web/deck.js';

function cardKey(card) {
  return `${card.key}-${card.rank}`;
}

// Default deck tests
const defaultDeck = buildDeck();
assert.equal(defaultDeck.length, suits.length * ranks.length, 'デフォルトのデッキ枚数が正しくありません');
const defaultIds = new Set(defaultDeck.map(cardKey));
assert.equal(defaultIds.size, defaultDeck.length, 'デフォルトデッキでカードIDが重複しています');

const defaultKing = defaultDeck.find((card) => card.rank === 'K');
assert.equal(defaultKing?.value, valueByRank.K, 'デフォルトのキングの値が不正です');

// Custom deck tests
for (const max of VALID_CUSTOM_MAX) {
  const deck = buildDeck({ mode: 'custom', maxValue: max });
  assert.equal(deck.length, suits.length * max, `カスタム上限${max}のデッキ枚数が不正です`);
  const values = new Set(deck.map((card) => card.value));
  assert.equal(Math.min(...values), 1, `カスタム上限${max}で最小値が1ではありません`);
  assert.equal(Math.max(...values), max, `カスタム上限${max}で最大値が一致しません`);
  const idSet = new Set(deck.map(cardKey));
  assert.equal(idSet.size, deck.length, `カスタム上限${max}でカードIDが重複しています`);
}

console.log('deck.test.mjs: OK');
