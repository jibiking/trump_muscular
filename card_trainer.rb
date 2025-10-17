#!/usr/bin/env ruby
# frozen_string_literal: true

require 'optparse'

module CardTrainer
  SUIT_DEFINITIONS = [
    { key: :spades, name: 'スペード', glyph: '♠', exercise: '腕立て伏せ', color: :blue },
    { key: :hearts, name: 'ハート', glyph: '♥', exercise: 'スクワット', color: :red },
    { key: :diamonds, name: 'ダイヤ', glyph: '♦', exercise: '腹筋', color: :red },
    { key: :clubs, name: 'クラブ', glyph: '♣', exercise: 'バーピー', color: :blue }
  ].freeze

  RANKS = %w[A 2 3 4 5 6 7 8 9 10 J Q K].freeze
  VALUE_FOR_RANK = RANKS.each_with_object({}) do |rank, memo|
    memo[rank] = case rank
                 when 'A' then 1
                 when 'J' then 11
                 when 'Q' then 12
                 when 'K' then 20
                 else
                   rank.to_i
                 end
  end.freeze

  Card = Struct.new(:rank, :suit, :glyph, :exercise, :value, keyword_init: true) do
    def label
      "#{glyph} #{rank}"
    end
  end

  class Deck
    attr_reader :cards

    def initialize(random: Random.new)
      @random = random
      @cards = build_cards
    end

    def shuffle!
      @cards.shuffle!(random: @random)
      self
    end

    def draw
      @cards.pop
    end

    def remaining_count
      @cards.length
    end

    def empty?
      @cards.empty?
    end

    def remaining_cards
      @cards.dup
    end

    private

    def build_cards
      SUIT_DEFINITIONS.flat_map do |definition|
        RANKS.map do |rank|
          Card.new(
            rank: rank,
            suit: definition[:name],
            glyph: definition[:glyph],
            exercise: definition[:exercise],
            value: VALUE_FOR_RANK.fetch(rank)
          )
        end
      end
    end
  end

  class Trainer
    attr_reader :totals, :history

    def initialize(deck: Deck.new)
      @deck = deck
      @totals = SUIT_DEFINITIONS.map { |definition| [definition[:exercise], 0] }.to_h
      @history = []
    end

    def draw_card
      card = @deck.draw
      return nil unless card

      @totals[card.exercise] += card.value
      @history << card
      card
    end

    def cards_remaining
      @deck.remaining_count
    end

    def deck_empty?
      @deck.empty?
    end

    def remaining_breakdown
      breakdown = Hash.new(0)
      @deck.remaining_cards.each do |card|
        breakdown[card.suit] += 1
      end
      breakdown
    end

    def deck
      @deck
    end
  end

  class CLI
    PROMPT = 'Enterキーでカードを引く（終了:q、途中集計:s）… '
    ANSI_ESCAPE_REGEX = /\e\[[0-9;]*m/.freeze

    def initialize(options)
      @options = options
      seed = options[:seed]
      random = seed ? Random.new(seed) : Random.new(Process.clock_gettime(Process::CLOCK_MONOTONIC, :nanosecond))
      @trainer = Trainer.new(deck: Deck.new(random: random).shuffle!)
    end

    def run
      clear_screen
      splash_screen
      loop do
        break if @trainer.deck_empty?

        input = prompt_user
        action = interpret_input(input)

        case action
        when :quit
          farewell_summary('途中終了')
          return
        when :summary
          clear_screen
          print_summary('途中経過')
        when :draw
          card = @trainer.draw_card
          next unless card

          clear_screen
          print_card_panel(card)
          ring_bell
        else
          puts "入力は Enter / s / q のみです。"
        end
      end

      clear_screen
      completion_banner
    end

    private

    def prompt_user
      print PROMPT
      STDOUT.flush
      input = STDIN.gets
      puts
      input
    end

    def interpret_input(raw_input)
      return :quit if raw_input.nil?

      trimmed = raw_input.strip
      return :draw if trimmed.empty?

      case trimmed.downcase
      when 'q' then :quit
      when 's' then :summary
      else
        :invalid
      end
    end

    def ring_bell
      return unless @options[:bell]

      print "\a"
      STDOUT.flush
    end

    def clear_screen
      print "\e[H\e[2J"
    end

    def splash_screen
      puts 'カードトレーナーCLIへようこそ！'
      puts mapping_table
      puts '全52枚のトランプを使います。'
      puts '操作: Enter=カードを引く, s=途中集計, q=終了'
      puts
    end

    def mapping_table
      rows = SUIT_DEFINITIONS.map do |definition|
        "  #{definition[:glyph]} #{definition[:name]} → #{definition[:exercise]}（カードの数字そのまま回数）"
      end
      (["スートとトレーニングの対応表:"] + rows).join("\n")
    end

    def print_card_panel(card)
      header = "#{colorize(card.glyph, suit_color(card))} #{card.rank} → #{card.value}回 #{card.exercise}"
      puts header
      if card.rank == 'K'
        puts 'ウィィィー！！！'
        puts 'Kのカードはボーナスで20回実施だぜ！最高だな！ブラザー！！'
      else
        puts motivational_message(card.exercise)
      end
      puts
      totals_summary_lines(60).each { |line| puts line }
      puts "残りカード: #{@trainer.cards_remaining}枚"
      puts
    end

    def motivational_message(exercise)
      case exercise
      when '腕立て伏せ'
        '胸を張ってテンポ良く！'
      when 'スクワット'
        '膝とつま先の向きをそろえて！'
      when '腹筋'
        '呼吸を止めずにコツコツ！'
      when 'バーピー'
        'ジャンプで全身爆発だ！'
      else
        '全力でいこう！'
      end
    end

    def totals_summary_lines(max_width)
      parts = @trainer.totals.map { |exercise, count| "#{exercise} #{count}回" }
      header = '累計: '
      return [header.strip] if parts.empty?

      lines = []
      current = header.dup

      parts.each do |part|
        connector = current.strip == header.strip ? '' : ' / '
        candidate = current + connector + part

        if visible_length(candidate) <= max_width
          current = candidate
        else
          lines << current.rstrip
          current = (' ' * visible_length(header)) + part
        end
      end

      lines << current.rstrip
      lines
    end

    def visible_length(text)
      text.gsub(ANSI_ESCAPE_REGEX, '').length
    end

    def suit_color(card)
      case card.glyph
      when '♥', '♦'
        :red
      else
        :blue
      end
    end

    def print_summary(title)
      puts "#{title}"
      puts '-' * title.length
      @trainer.totals.each do |exercise, count|
        puts format("%-10s : %d回", exercise, count)
      end
      puts
      puts "引いた枚数 : #{@trainer.history.length}枚"
      puts "残り枚数   : #{@trainer.cards_remaining}枚"
      puts
    end

    def farewell_summary(title)
      clear_screen
      print_summary(title)
      breakdown = @trainer.remaining_breakdown
      unless breakdown.empty?
        puts '未ドロー枚数（スート別）:'
        breakdown.each do |suit, count|
          puts format("  %-6s %d枚", suit, count)
        end
      end
      puts
      puts 'お疲れさまでした！また挑戦してください。'
    end

    def completion_banner
      title = 'おめでとうございます！全カード達成！'
      puts title
      puts '=' * title.length
      print_summary('合計回数')
      puts '素晴らしい！クールダウンのストレッチも忘れずに。'
    end

    def colorize(text, color)
      return text unless @options[:color]

      code = case color
             when :red then '\e[31m'
             when :blue then '\e[34m'
             else
               nil
             end
      return text unless code

      "#{code}#{text}\e[0m"
    end
  end
end

if __FILE__ == $PROGRAM_NAME
  options = { color: false, bell: true }

  OptionParser.new do |parser|
    parser.banner = '使い方: ruby card_trainer.rb [オプション]'

    parser.on('--seed=SEED', Integer, 'シャッフル順を固定するシード値') do |seed|
      options[:seed] = seed
    end

    parser.on('--no-color', 'ANSIカラー表示を無効化する') do
      options[:color] = false
    end

    parser.on('--no-bell', 'カードを引いたときのベル音を鳴らさない') do
      options[:bell] = false
    end

    parser.on('-h', '--help', 'このヘルプを表示する') do
      puts parser
      exit
    end
  end.parse!(ARGV)

  CardTrainer::CLI.new(options).run
end
