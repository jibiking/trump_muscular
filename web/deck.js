export const suits = [
  { key: 'spade', name: 'スペード', glyph: '♠', exercise: '腕立て伏せ', fill: '♠', toneClass: 'tone-spade' },
  { key: 'heart', name: 'ハート', glyph: '♥', exercise: 'スクワット', fill: '♥', toneClass: 'tone-heart' },
  { key: 'diamond', name: 'ダイヤ', glyph: '♦', exercise: '腹筋', fill: '♦', toneClass: 'tone-diamond' },
  { key: 'club', name: 'クラブ', glyph: '♣', exercise: 'バーピー', fill: '♣', toneClass: 'tone-club' }
];

export const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const valueByRank = {
  A: 1,
  J: 11,
  Q: 12,
  K: 22
};

export const VALID_CUSTOM_MAX = [20, 30, 40, 50];

export function buildDeck(settings = { mode: 'default' }) {
  const now = Date.now();
  const isCustom = settings?.mode === 'custom' && VALID_CUSTOM_MAX.includes(Number(settings.maxValue));
  const maxValue = isCustom ? Number(settings.maxValue) : null;
  const deck = [];

  suits.forEach((suit) => {
    if (isCustom && maxValue) {
      for (let value = 1; value <= maxValue; value += 1) {
        deck.push({
          ...suit,
          rank: String(value),
          value,
          id: `${suit.key}-${value}-${now}`
        });
      }
    } else {
      ranks.forEach((rank) => {
        const value = valueByRank[rank] ?? Number(rank);
        deck.push({
          ...suit,
          rank,
          value,
          id: `${suit.key}-${rank}-${now}`
        });
      });
    }
  });

  return deck;
}
