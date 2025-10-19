import { describe, expect, it } from 'vitest';
import { buildDeck, suits, VALID_CUSTOM_MAX } from '../deck';

describe('buildDeck default mode', () => {
  const deck = buildDeck();

  it('generates 52 unique cards', () => {
    expect(deck).toHaveLength(suits.length * 13);
    const signatures = new Set(deck.map((card) => `${card.key}-${card.rank}`));
    expect(signatures.size).toBe(deck.length);
  });

  it('maps face cards to the expected values', () => {
    const king = deck.find((card) => card.rank === 'K');
    const queen = deck.find((card) => card.rank === 'Q');
    const jack = deck.find((card) => card.rank === 'J');
    const ace = deck.find((card) => card.rank === 'A');
    expect(king?.value).toBe(22);
    expect(queen?.value).toBe(12);
    expect(jack?.value).toBe(11);
    expect(ace?.value).toBe(1);
  });
});

describe('buildDeck custom mode', () => {
  it.each(VALID_CUSTOM_MAX)('builds %d cards per suit with sequential values', (maxValue) => {
    const deck = buildDeck({ mode: 'custom', maxValue });
    expect(deck).toHaveLength(suits.length * maxValue);

    for (const suit of suits) {
      const suitCards = deck.filter((card) => card.key === suit.key);
      const values = suitCards.map((card) => card.value).sort((a, b) => a - b);
      expect(values[0]).toBe(1);
      expect(values[values.length - 1]).toBe(maxValue);
      for (let i = 0; i < values.length; i += 1) {
        expect(values[i]).toBe(i + 1);
      }
    }

    const signatureSet = new Set(deck.map((card) => `${card.key}-${card.rank}`));
    expect(signatureSet.size).toBe(deck.length);
  });
});
