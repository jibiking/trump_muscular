# frozen_string_literal: true

require 'minitest/autorun'
require_relative '../card_trainer'

class DeckTest < Minitest::Test
  def setup
    @deck = CardTrainer::Deck.new(random: Random.new(123)).shuffle!
  end

  def test_deck_has_52_unique_cards
    assert_equal 52, @deck.cards.size
    signatures = @deck.cards.map { |card| [card.suit, card.rank] }
    assert_equal signatures.uniq, signatures
  end

  def test_card_values_follow_spec
    pure_deck = CardTrainer::Deck.new
    pure_deck.cards.each do |card|
      expected = CardTrainer::VALUE_FOR_RANK.fetch(card.rank)
      assert_equal expected, card.value, "Expected #{card.rank} to map to #{expected}"
    end
  end

  def test_shuffle_changes_order
    control_deck = CardTrainer::Deck.new(random: Random.new(123))
    refute_equal control_deck.cards.map(&:label), @deck.cards.map(&:label)
  end
end
