# Card Trainer CLI Specification

## Goal
Create an interactive Ruby CLI that emulates the "トランプ筋トレ" routine described in https://dime.jp/genre/1355455/. A shuffled 52-card deck (no jokers) is processed one card at a time; each card dictates a bodyweight exercise and repetition count.

## Target Environment
- Ruby 3.1+ (test with the system Ruby available in the workspace)
- Terminal capable of rendering UTF-8 (for suit glyphs ♠ ♥ ♦ ♣) and ANSI colors.

## Exercise Mapping (fixed)
| Suit | Glyph | Exercise      | Rep calculation |
|------|-------|---------------|-----------------|
| Spades    | ♠ | Push-ups (腕立て伏せ) | face value (J/Q/K = 11/12/13, A = 1) |
| Hearts    | ♥ | Squats (スクワット)   | face value |
| Diamonds  | ♦ | Sit-ups (腹筋)        | face value |
| Clubs     | ♣ | Burpees (バーピー)    | face value |

Face cards count as: A=1, 2-10 as number, J=11, Q=12, K=13.

## User Flow
1. `ruby card_trainer.rb` starts the program.
2. Display a colorful splash screen showing the mapping table, total cards (52), and controls.
3. Prompt: `Press Enter to draw the first card (q to quit)…`.
4. Each draw:
   - Randomly pops the next card from the shuffled deck.
   - Show a card panel, e.g.
     ```
     ┏━━━━━━━━━━━━━━━━━━━━━━━┓
     ┃ ♥ 4  →  4 Squats      ┃
     ┣━━━━━━━━━━━━━━━━━━━━━━━┫
     ┃ 累計: Push-ups 20 / Squats 14 / Sit-ups 13 / Burpees 18 ┃
     ┃ Cards remaining: 37                                     ┃
     ┗━━━━━━━━━━━━━━━━━━━━━━━┛
     ```
   - Suit glyphs should be colorized (♠/♣ in blue, ♥/♦ in red) via ANSI escape codes.
   - Repetition wording should pluralize correctly (e.g., `1 Sit-up`, `2 Sit-ups`).
5. Await next action:
   - Enter (or empty input) → draw next card.
   - `s` → skip reveal and show summary so far; resume drawing afterward.
   - `q` → exit early with a summary of completed exercises and undrawn cards.
6. When deck empties, show a celebratory completion banner summarizing totals and suggest cool-down.

## Data & State Requirements
- `Deck` class: builds 52 cards, shuffles via `Random.new` seeded by `Process.clock_gettime` for run-to-run variety.
- `Card` struct/class storing `rank`, `suit`, `glyph`, `value`, `exercise`.
- `Trainer` controller managing:
  - Remaining deck (array/stack)
  - Totals per exercise (hash)
  - History log (array of drawn cards) for optional future export (not required in v1 but keep structure ready).

## CLI Interaction Details
- Input via `STDIN.gets`; handle `nil` (EOF) same as `q`.
- Refresh screen between draws by printing ANSI clear (`\e[H\e[2J`) for a pop feel.
- Provide audible bell option (toggle using `--no-bell` cli flag; default beep `\a` after each draw for extra hype).
- Optional CLI flags:
  - `--seed=<integer>` to reproduce a shuffle order (for testing/demo).
  - `--no-color` to disable ANSI colors for terminals that don’t support them.
  - `--no-bell` to silence the bell.

## Non-Goals (v1)
- GUI or TUI frameworks beyond standard output.
- Persistence of past sessions.
- Customizable exercise mapping (consider for future iteration).

## Validation
- Manual QA by running the script and stepping through a dozen draws verifying:
  - Suit glyph renders with correct color.
  - Exercise counts accumulate accurately.
  - Commands `q` and `s` behave as specified.
- Add a lightweight automated test (RSpec or Minitest) for the deck (size, uniqueness, value mapping) if time permits.

