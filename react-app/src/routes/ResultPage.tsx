import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageSetup } from '../hooks/usePageSetup';
import { useSimpleSpectrum } from '../hooks/useSimpleSpectrum';
import { loadResultSnapshot } from '../lib/sessionStorage';
import { formatDurationJP, formatTimestampJP } from '../lib/time';

export const ResultPage = () => {
  usePageSetup('result', 'リザルト - トランプマスキュラー');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useSimpleSpectrum(canvasRef, 56);
  const navigate = useNavigate();
  const snapshot = useMemo(() => loadResultSnapshot(), []);

  const message = snapshot
    ? `デッキを制覇したナイスフロウ！${formatTimestampJP(snapshot.completedAt) ?? 'ついさっき'}にセッション完了、クラブビートがまだ鳴り止まないぜブラザー！！`
    : '最新のセッション結果が見つかりません。新たなセッションで燃え上がろう！';

  const deckLabel = snapshot?.settings.mode === 'custom'
    ? `カスタム / 最大${snapshot.settings.maxValue}レップ`
    : 'デフォルトデッキ';

  const totalCards = snapshot
    ? snapshot.totalCards ?? (snapshot.settings.mode === 'custom' ? snapshot.settings.maxValue * 4 : 52)
    : 52;

  return (
    <>
      <canvas ref={canvasRef} className="spectrum-canvas" aria-hidden="true" />
      <main className="app app--result">
        <header className="hero hero--result">
          <div>
            <p className="tag">Session Report</p>
            <h1>セッションリザルト</h1>
            <p className="lead lead--result">{message}</p>
          </div>
          <div className="result-actions">
            <button type="button" className="btn ghost" onClick={() => navigate('/')}>TOPへ戻る</button>
            <button type="button" className="btn primary" onClick={() => navigate('/training')}>もう一度ブチ上げる</button>
          </div>
        </header>

        {snapshot && (
          <>
            <section className="result-summary" aria-live="polite">
              <div className="result-metric">
                <span className="result-metric__label">総レップ</span>
                <strong className="result-metric__value">{snapshot.totalReps}</strong>
              </div>
              <div className="result-metric">
                <span className="result-metric__label">ドロー枚数</span>
                <strong className="result-metric__value">{snapshot.draws}</strong>
              </div>
              <div className="result-metric">
                <span className="result-metric__label">所要時間</span>
                <strong className="result-metric__value">{formatDurationJP(snapshot.durationSeconds)}</strong>
              </div>
              <div className="result-metric">
                <span className="result-metric__label">開始時刻</span>
                <strong className="result-metric__value">{formatTimestampJP(snapshot.startedAt) ?? '---'}</strong>
              </div>
              <div className="result-metric">
                <span className="result-metric__label">デッキ構成</span>
                <strong className="result-metric__value">{deckLabel}</strong>
              </div>
              <div className="result-metric">
                <span className="result-metric__label">総カード枚数</span>
                <strong className="result-metric__value">{totalCards}</strong>
              </div>
            </section>

            <section className="result-totals">
              <h2>種目別トータル</h2>
              <ul className="result-totals__list">
                {Object.entries(snapshot.totals).map(([exercise, count]) => (
                  <li key={exercise}>
                    <span>{exercise}</span>
                    <strong>{count} 回</strong>
                  </li>
                ))}
              </ul>
            </section>

            <section className="result-history">
              <h2>ドローログ</h2>
              <ol className="result-history__list">
                {snapshot.history.map((entry) => (
                  <li key={`${entry.order}-${entry.key}-${entry.rank}`}>
                    <span className="result-history__badge">{entry.glyph} {entry.rank}</span>
                    <div>
                      <p className="result-history__exercise">{entry.exercise} {entry.value} 回</p>
                      <p className="result-history__suit">{entry.order}枚目・{entry.suit}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </main>
    </>
  );
};
