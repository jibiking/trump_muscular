import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  type DeckCard,
  type ExerciseName,
  type SessionSettings,
  buildDeck,
  buildInitialTotals,
  shuffleDeck,
  suits
} from '../lib/deck';
import { clearResultSnapshot, loadSessionSettings, saveResultSnapshot } from '../lib/sessionStorage';
import { AUTO_RESULT_DELAY_MS } from '../lib/constants';
import { exerciseLabels, exerciseTips, pickHypeLine } from '../lib/exercises';
import { formatClock } from '../lib/time';
import { usePageSetup } from '../hooks/usePageSetup';
import { useTrainingAudio, type AudioPauseSnapshot } from '../hooks/useTrainingAudio';
import { useGlobalAudioRef } from '../context/AudioProvider';

interface TrainingState {
  deck: DeckCard[];
  totalCards: number;
  history: DeckCard[];
  totals: Record<ExerciseName, number>;
  sessionStarted: boolean;
  startedAt: number | null;
  lastDrawnCard: DeckCard | null;
}

interface SummaryPauseState {
  countdown: number | null;
  totalTimerActive: boolean;
  audio: AudioPauseSnapshot;
}

const createTrainingState = (settings: SessionSettings): TrainingState => {
  const deck = shuffleDeck(buildDeck(settings));
  return {
    deck,
    totalCards: deck.length,
    history: [],
    totals: buildInitialTotals(),
    sessionStarted: false,
    startedAt: null,
    lastDrawnCard: null
  };
};

export const TrainingPage = () => {
  usePageSetup('training', 'トレーニング - トランプマスキュラー');
  const navigate = useNavigate();
  const [settings] = useState<SessionSettings>(() => loadSessionSettings());
  const [state, setState] = useState<TrainingState>(() => createTrainingState(settings));
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [navigateScheduled, setNavigateScheduled] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const sessionRef = useRef(state);
  const countdownPausedRef = useRef(false);
  const totalTimerRef = useRef<number | null>(null);
  const countdownTimeoutRef = useRef<number | null>(null);
  const navigateTimeoutRef = useRef<number | null>(null);
  const summaryPauseRef = useRef<SummaryPauseState | null>(null);
  const autoStartRef = useRef(false);
  const resultSavedRef = useRef(false);

  const audioRef = useGlobalAudioRef();
  const changeSoundRef = useRef<HTMLAudioElement | null>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const summaryDialogRef = useRef<HTMLDialogElement | null>(null);

  const {
    musicReady,
    soundMuted,
    desiredMuted,
    toggleSound,
    setDesiredMuted,
    applySoundState,
    pauseForSummary: pauseAudioForSummary,
    resumeFromSummary: resumeAudioFromSummary,
    stop: stopAudio
  } = useTrainingAudio(audioRef, spectrumCanvasRef);

  useEffect(() => {
    sessionRef.current = state;
  }, [state]);

  useEffect(() => {
    changeSoundRef.current = new Audio('/change.mp3');
    changeSoundRef.current.volume = 0.7;
    changeSoundRef.current.preload = 'auto';
    return () => {
      changeSoundRef.current?.pause();
      changeSoundRef.current = null;
    };
  }, []);

  useEffect(() => {
    clearResultSnapshot();
  }, [clearResultSnapshot]);

  const startTotalTimer = useCallback(() => {
    const update = () => {
      const startedAt = sessionRef.current.startedAt;
      if (!startedAt) {
        setTotalSeconds(0);
        return;
      }
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setTotalSeconds(elapsed);
    };
    update();
    if (totalTimerRef.current) {
      window.clearInterval(totalTimerRef.current);
    }
    totalTimerRef.current = window.setInterval(update, 1000);
  }, []);

  const stopTotalTimer = useCallback(() => {
    if (totalTimerRef.current) {
      window.clearInterval(totalTimerRef.current);
      totalTimerRef.current = null;
    }
  }, []);

  const persistResultSnapshot = useCallback(() => {
    const current = sessionRef.current;
    if (resultSavedRef.current || current.history.length === 0) return;
    const now = Date.now();
    const startedAt = current.startedAt ?? now;
    const durationSeconds = current.startedAt
      ? Math.max(0, Math.round((now - current.startedAt) / 1000))
      : 0;
    const totalReps = Object.values(current.totals).reduce((sum, value) => sum + value, 0);
    saveResultSnapshot({
      version: 1,
      completedAt: now,
      startedAt,
      durationSeconds,
      totals: { ...current.totals },
      history: current.history.map((card, index) => ({
        order: index + 1,
        key: card.key,
        suit: card.name,
        glyph: card.glyph,
        rank: card.rank,
        value: card.value,
        exercise: card.exercise
      })),
      draws: current.history.length,
      totalReps,
      totalCards: current.totalCards,
      settings
    });
    resultSavedRef.current = true;
  }, [settings]);

  const cancelNavigateTimeout = useCallback(() => {
    if (navigateTimeoutRef.current) {
      window.clearTimeout(navigateTimeoutRef.current);
      navigateTimeoutRef.current = null;
    }
  }, []);

  const navigateToResult = useCallback(() => {
    persistResultSnapshot();
    cancelNavigateTimeout();
    stopAudio(true);
    navigate('/result');
  }, [cancelNavigateTimeout, navigate, persistResultSnapshot, stopAudio]);

  const scheduleNavigateToResult = useCallback(() => {
    if (navigateScheduled) return;
    setNavigateScheduled(true);
    persistResultSnapshot();
    stopAudio(true);
    cancelNavigateTimeout();
    navigateTimeoutRef.current = window.setTimeout(() => {
      navigateToResult();
    }, AUTO_RESULT_DELAY_MS);
  }, [cancelNavigateTimeout, navigateScheduled, navigateToResult, persistResultSnapshot, stopAudio]);

  const playChangeSound = useCallback(() => {
    const sound = changeSoundRef.current;
    if (!sound) return;
    try {
      sound.currentTime = 0;
      const playResult = sound.play();
      if (playResult instanceof Promise) {
        playResult.catch(() => {
          /* ignore autoplay issues */
        });
      }
    } catch (error) {
      /* ignore */
    }
  }, []);

  const startCountdown = useCallback((seconds: number) => {
    countdownPausedRef.current = false;
    if (countdownTimeoutRef.current) {
      window.clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
    setCountdownSeconds(seconds);
  }, []);

  const drawCard = useCallback(() => {
    const current = sessionRef.current;
    if (current.deck.length === 0) return;

    const deck = [...current.deck];
    const card = deck.pop()!;
    const totals = {
      ...current.totals,
      [card.exercise]: current.totals[card.exercise] + card.value
    } as Record<ExerciseName, number>;
    const startedNow = !current.sessionStarted;
    const startedAt = current.sessionStarted ? current.startedAt : Date.now();
    const nextState: TrainingState = {
      deck,
      totalCards: current.totalCards,
      history: [...current.history, card],
      totals,
      sessionStarted: true,
      startedAt,
      lastDrawnCard: card
    };

    sessionRef.current = nextState;
    setState(nextState);

    playChangeSound();

    if (startedNow) {
      startTotalTimer();
    }

    startCountdown(card.value + 10);

    if (deck.length === 0) {
      stopTotalTimer();
      setCountdownSeconds(0);
      stopAudio(true);
      scheduleNavigateToResult();
    }
  }, [playChangeSound, scheduleNavigateToResult, startCountdown, startTotalTimer, stopAudio, stopTotalTimer]);

  const handleCountdownFinished = useCallback(() => {
    const current = sessionRef.current;
    if (current.deck.length > 0) {
      drawCard();
    } else {
      scheduleNavigateToResult();
    }
  }, [drawCard, scheduleNavigateToResult]);

  useEffect(() => {
    if (countdownSeconds === null) {
      if (countdownTimeoutRef.current) {
        window.clearTimeout(countdownTimeoutRef.current);
        countdownTimeoutRef.current = null;
      }
      return;
    }
    if (countdownPausedRef.current) {
      return;
    }
    if (countdownSeconds <= 0) {
      handleCountdownFinished();
      return;
    }
    countdownTimeoutRef.current = window.setTimeout(() => {
      setCountdownSeconds((prev) => (prev === null ? prev : prev - 1));
    }, 1000);
    return () => {
      if (countdownTimeoutRef.current) {
        window.clearTimeout(countdownTimeoutRef.current);
        countdownTimeoutRef.current = null;
      }
    };
  }, [countdownSeconds, handleCountdownFinished]);

  useEffect(() => {
    if (autoStartRef.current) return;
    if (state.deck.length === 0) return;
    autoStartRef.current = true;
    if (desiredMuted) {
      setDesiredMuted(false);
    }
    void applySoundState();
    drawCard();
  }, [applySoundState, desiredMuted, drawCard, setDesiredMuted, state.deck.length]);

  const openSummary = useCallback(() => {
    if (summaryOpen || state.deck.length === 0) return;
    const audioSnapshot = pauseAudioForSummary();
    summaryPauseRef.current = {
      countdown: countdownSeconds,
      totalTimerActive: Boolean(totalTimerRef.current),
      audio: audioSnapshot
    };
    countdownPausedRef.current = true;
    if (countdownTimeoutRef.current) {
      window.clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
    stopTotalTimer();
    setSummaryOpen(true);
    const dialog = summaryDialogRef.current;
    if (dialog) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', 'open');
        dialog.classList.add('summary--inline');
      }
    }
  }, [countdownSeconds, pauseAudioForSummary, state.deck.length, stopTotalTimer, summaryOpen]);

  const resumeFromSummary = useCallback(() => {
    if (!summaryOpen) return;
    const snapshot = summaryPauseRef.current;
    summaryPauseRef.current = null;
    setSummaryOpen(false);
    countdownPausedRef.current = false;
    const audioSnapshot = snapshot?.audio ?? { wasPlaying: false, spectrumRunning: false };
    resumeAudioFromSummary(audioSnapshot);
    if (snapshot?.totalTimerActive && sessionRef.current.sessionStarted && sessionRef.current.deck.length > 0) {
      startTotalTimer();
    }
    if (snapshot?.countdown && snapshot.countdown > 0 && sessionRef.current.deck.length > 0) {
      setCountdownSeconds(snapshot.countdown);
    } else if (snapshot?.countdown === 0 && sessionRef.current.deck.length === 0) {
      scheduleNavigateToResult();
    }
    const dialog = summaryDialogRef.current;
    if (dialog) {
      if (typeof dialog.close === 'function') {
        if (dialog.open) {
          dialog.close();
        }
      } else {
        dialog.removeAttribute('open');
        dialog.classList.remove('summary--inline');
      }
    }
  }, [resumeAudioFromSummary, scheduleNavigateToResult, startTotalTimer, summaryOpen]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      if (event.key === 'Enter') {
        event.preventDefault();
        drawCard();
      } else if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        openSummary();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [drawCard, openSummary]);

  useEffect(() => () => {
    stopTotalTimer();
    if (countdownTimeoutRef.current) {
      window.clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
    cancelNavigateTimeout();
  }, [cancelNavigateTimeout, stopTotalTimer]);

  const progressPercent = useMemo(() => {
    if (state.totalCards === 0) return 0;
    return Math.round((state.history.length / state.totalCards) * 100);
  }, [state.history.length, state.totalCards]);

  const countdownLabel = formatClock(countdownSeconds);
  const totalTimeLabel = formatClock(totalSeconds);
  const soundButtonLabel = musicReady
    ? desiredMuted || soundMuted
      ? '音を解放！'
      : 'サウンド停止'
    : 'サウンド準備中';
  const soundButtonDisabled = !musicReady && desiredMuted;
  const soundButtonPressed = !desiredMuted && !soundMuted;
  const soundButtonStatus = musicReady ? undefined : 'loading';
  const soundButtonState = desiredMuted ? 'off' : 'on';

  const suitRemain = useMemo(() => {
    const remainMap = new Map<string, number>();
    suits.forEach((suit) => remainMap.set(suit.key, 0));
    state.deck.forEach((card) => {
      remainMap.set(card.key, (remainMap.get(card.key) ?? 0) + 1);
    });
    return suits.map((suit) => ({
      name: suit.name,
      key: suit.key,
      remain: remainMap.get(suit.key) ?? 0
    }));
  }, [state.deck]);

  const hypeLine = useMemo(() => {
    const card = state.lastDrawnCard;
    if (!card) return null;
    if (settings.mode === 'default' && card.rank === 'K') {
      return 'ウィィィー！！！キングで22回コンボフィーバー、クラブビート合わせて筋肉リーダー！ブラザー！！';
    }
    return pickHypeLine(card.value + card.rank.charCodeAt(0));
  }, [settings.mode, state.lastDrawnCard]);

  const guidance = useMemo(() => {
    const card = state.lastDrawnCard;
    if (!card) return null;
    if (settings.mode === 'default' && card.rank === 'K') {
      return hypeLine;
    }
    const tip = exerciseTips[card.exercise];
    return `${tip}！${hypeLine ?? ''}`;
  }, [hypeLine, settings.mode, state.lastDrawnCard]);

  const lastCardExerciseLabel = state.lastDrawnCard
    ? exerciseLabels[state.lastDrawnCard.exercise]
    : null;

  return (
    <>
      <canvas ref={spectrumCanvasRef} className="spectrum-canvas" aria-hidden="true" />
      <button
        type="button"
        className="sound-toggle"
        onClick={toggleSound}
        disabled={soundButtonDisabled}
        data-status={soundButtonStatus}
        data-state={soundButtonState}
        aria-pressed={soundButtonPressed}
        title={!musicReady ? '音源読み込み中です' : undefined}
      >
        {soundButtonLabel}
      </button>
      <main className="app">
        <header className="hero">
          <div>
            <p className="tag">Deck Remix</p>
            <h1>トレーニングセッション</h1>
            <p className="lead lead--session">
              セッションをスタートしたらカードの指示に従ってフロウしよう。カードを引いてコンボを刻み、終わったらリザルトで成果をチェックだ！
            </p>
          </div>
          <div className="hero-controls">
            <button id="btn-draw" className="btn primary" onClick={drawCard} disabled={state.deck.length === 0}>
              <span className="btn__label">{state.deck.length === state.totalCards ? 'カードを引く' : '次のカード'}</span>
              <span className="btn__hint">Enter</span>
            </button>
            <button
              id="btn-summary"
              className={`btn ghost${state.deck.length === 0 ? ' is-hidden' : ''}`}
              onClick={openSummary}
              disabled={state.deck.length === 0}
            >
              <span className="btn__label">途中経過</span>
              <span className="btn__hint">S</span>
            </button>
            <button
              id="btn-result"
              className={`btn ghost btn-result${state.deck.length === 0 ? '' : ' is-hidden'}`}
              onClick={navigateToResult}
              disabled={state.history.length === 0}
            >
              <span className="btn__label">リザルトへ</span>
            </button>
            <button type="button" className="btn text" onClick={() => navigate('/')}>TOPへ戻る</button>
          </div>
        </header>

        <section className="session-info" aria-label="タイマー">
          <div className="session-info__metric">
            <span>総トレーニング時間</span>
            <strong id="total-time">{totalTimeLabel}</strong>
          </div>
          <div className="session-info__metric">
            <span>次のカードまで</span>
            <strong id="countdown-timer">{countdownLabel}</strong>
          </div>
        </section>

        <section className="card-stage card-stage--inline">
          <div className="card-layout">
            <div className="card-cta">
              <button
                id="btn-draw-mobile"
                className="btn primary btn--mobile"
                onClick={drawCard}
                disabled={state.deck.length === 0}
              >
                {state.deck.length === state.totalCards ? 'カードを引く' : '次のカード'}
              </button>
              <button
                id="btn-result-mobile"
                className={`btn ghost btn--mobile${state.deck.length === 0 ? '' : ' is-hidden'}`}
                onClick={navigateToResult}
                disabled={state.history.length === 0}
              >
                リザルトへ
              </button>
              <button type="button" className="btn text btn--mobile" onClick={() => navigate('/')}>TOPへ戻る</button>
            </div>
            <div id="card-display" className={`card${state.lastDrawnCard ? '' : ' card--empty'}`}>
              {state.lastDrawnCard ? (
                <>
                  <div className="card__header">
                    <span className={`card__suit ${state.lastDrawnCard.toneClass}`}>{state.lastDrawnCard.glyph}</span>
                    <div className="card__rank">{state.lastDrawnCard.rank}</div>
                  </div>
                  <div className="card__body">
                    <div className="card__exercise">{lastCardExerciseLabel}</div>
                    <p className="card__value">{state.lastDrawnCard.value} 回</p>
                    {guidance && <p className="card__flow card__flow--lead">{guidance}</p>}
                  </div>
                  <div className="card__footer">
                    <span>累計 {state.totals[state.lastDrawnCard.exercise]} 回</span>
                    <span>残り {state.deck.length} 枚</span>
                  </div>
                </>
              ) : (
                <div className="card__placeholder">
                  <span className="card__placeholder-icon">🃏</span>
                  <p>ドローでスタート、リズムでハート！燃やせ筋肉エンジン全開アート！ブラザー！！</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="status-grid">
          <article className="status-card">
            <h2>ステータスチェック</h2>
            <div className="progress">
              <div id="progress-bar" className="progress__bar" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="progress__text" id="progress-text">
              {state.history.length} / {state.totalCards} 枚
            </p>
          </article>
          <article className="status-card totalling">
            <h2>累計コンボ</h2>
            <ul id="totals-list" className="totals">
              {(Object.entries(state.totals) as [ExerciseName, number][]).map(([exercise, count]) => (
                <li key={exercise}>
                  <span>{exercise}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="card-stage">
          <aside className="log">
            <h3>ドローログ</h3>
            <ol id="log-list" className="log__list">
              {[...state.history].reverse().map((card, index) => (
                <li key={`${card.id}-${index}`} className="log__item">
                  <span>
                    {card.glyph} {card.rank}
                  </span>
                  <span>
                    {card.exercise} {card.value}回
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        <section className="mapping">
          <h2>カードと運動のマッチング</h2>
          <div className="mapping__grid">
            {suits.map((suit) => (
              <div className="mapping__item" key={suit.key} data-suit={suit.key}>
                <div className="mapping__icon">{suit.glyph}</div>
                <div>
                  <h3>{suit.exercise}</h3>
                  <p>
                    {suit.key === 'spade' && '数字そのままの回数で胸を燃やそう！'}
                    {suit.key === 'heart' && 'リズムに合わせて足腰を鍛えよう！'}
                    {suit.key === 'diamond' && 'コアを締めて爆上げだ！'}
                    {suit.key === 'club' && '全身使って跳び回ろう！'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <dialog ref={summaryDialogRef} id="summary-dialog" className="summary" aria-label="途中経過">
        <div id="summary-content" className="summary__content">
          <p>
            引いた枚数：{state.history.length}枚 / 残り：{state.deck.length}枚
          </p>
          {settings.mode === 'custom' && (
            <p className="summary__note">カスタムモード：最大レップ {settings.maxValue}（キングは13回固定）</p>
          )}
          <h3>累計回数</h3>
          <ul className="summary__totals">
            {(Object.entries(state.totals) as [ExerciseName, number][]).map(([exercise, count]) => (
              <li key={`summary-${exercise}`}>
                <span>{exercise}</span>
                <strong>{count}回</strong>
              </li>
            ))}
          </ul>
          <h3>残りカード（スート別）</h3>
          <ul>
            {suitRemain.map((entry) => (
              <li key={entry.key}>{entry.name}：{entry.remain}枚</li>
            ))}
          </ul>
        </div>
        <div className="summary__actions">
          <button type="button" className="btn primary" onClick={resumeFromSummary}>
            セッションへ戻る
          </button>
        </div>
      </dialog>
    </>
  );
};
