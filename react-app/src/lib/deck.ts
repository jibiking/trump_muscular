export type SuitKey = 'spade' | 'heart' | 'diamond' | 'club';
export type ExerciseName = '腕立て伏せ' | 'スクワット' | 'バーピー' | '腹筋';

export interface SuitDefinition {
  key: SuitKey;
  name: string;
  glyph: string;
  exercise: ExerciseName;
  toneClass: string;
}

export interface DeckCard extends SuitDefinition {
  id: string;
  rank: string;
  value: number;
}

export interface DefaultSessionSettings {
  mode: 'default';
}

export interface CustomSessionSettings {
  mode: 'custom';
  maxValue: number;
}

export type SessionSettings = DefaultSessionSettings | CustomSessionSettings;

export const suits: SuitDefinition[] = [
  { key: 'spade', name: 'スペード', glyph: '♠', exercise: '腕立て伏せ', toneClass: 'tone-spade' },
  { key: 'heart', name: 'ハート', glyph: '♥', exercise: 'スクワット', toneClass: 'tone-heart' },
  { key: 'diamond', name: 'ダイヤ', glyph: '♦', exercise: '腹筋', toneClass: 'tone-diamond' },
  { key: 'club', name: 'クラブ', glyph: '♣', exercise: 'バーピー', toneClass: 'tone-club' }
];

const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
const valueByRank: Record<string, number> = {
  A: 1,
  J: 11,
  Q: 12,
  K: 22
};

export const VALID_CUSTOM_MAX = [20, 30, 40, 50] as const;
const VALID_CUSTOM_MAX_SET = new Set<number>(VALID_CUSTOM_MAX);

export function buildDeck(settings: SessionSettings = { mode: 'default' }): DeckCard[] {
  const timestamp = Date.now();
  const isCustom = settings.mode === 'custom' && VALID_CUSTOM_MAX_SET.has(settings.maxValue);
  const customMax = isCustom ? settings.maxValue : undefined;

  const deck: DeckCard[] = [];

  suits.forEach((suit) => {
    if (isCustom && typeof customMax === 'number') {
      for (let value = 1; value <= customMax; value += 1) {
        deck.push({
          ...suit,
          rank: String(value),
          value,
          id: `${suit.key}-${value}-${timestamp}`
        });
      }
    } else {
      ranks.forEach((rank) => {
        const value = valueByRank[rank] ?? Number(rank);
        deck.push({
          ...suit,
          rank,
          value,
          id: `${suit.key}-${rank}-${timestamp}`
        });
      });
    }
  });

  return deck;
}

export function shuffleDeck<T>(input: T[]): T[] {
  const deck = [...input];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function buildInitialTotals(): Record<ExerciseName, number> {
  return {
    腕立て伏せ: 0,
    スクワット: 0,
    バーピー: 0,
    腹筋: 0
  };
}

export function isValidCustomSettings(settings: SessionSettings): settings is CustomSessionSettings {
  return settings.mode === 'custom' && VALID_CUSTOM_MAX_SET.has(settings.maxValue);
}
