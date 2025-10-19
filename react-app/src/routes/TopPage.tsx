import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AUTO_UNMUTE_FLAG_KEY } from '../lib/constants';
import { clearSessionSettings } from '../lib/sessionStorage';
import { usePageSetup } from '../hooks/usePageSetup';
import { useSimpleSpectrum } from '../hooks/useSimpleSpectrum';
import { useGlobalAudioRef } from '../context/AudioProvider';
import { primeAudioGraphFromGesture } from '../hooks/useTrainingAudio';

export const TopPage = () => {
  usePageSetup('top', 'トランプマスキュラー');
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useGlobalAudioRef();
  useSimpleSpectrum(canvasRef);

  const handleDefaultStart = useCallback(async () => {
    clearSessionSettings();
    try {
      sessionStorage.setItem(AUTO_UNMUTE_FLAG_KEY, '1');
    } catch (error) {
      /* ignore */
    }
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      try {
        await primeAudioGraphFromGesture(audio);
      } catch (error) {
        /* autoplay restrictions will fall back in training */
      }
    }
    navigate('/training');
  }, [audioRef, navigate]);

  const handleCustomStart = useCallback(async () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      try {
        await primeAudioGraphFromGesture(audio);
      } catch (error) {
        /* ignore */
      }
    }
    navigate('/custom');
  }, [audioRef, navigate]);

  return (
    <>
      <canvas ref={canvasRef} className="spectrum-canvas" aria-hidden="true" />
      <main className="app app--landing">
        <header className="hero hero--landing">
          <div>
            <p className="tag">Deck Remix</p>
            <h1>トランプマスキュラー</h1>
            <p className="lead lead--landing">
              デッキをシャッフルしてトランプを1枚ずつめくり、スートとランクで決まる種目とレップをこなしながら全身を追い込むブラザートレーニングハブだ！クラブビートのスペクトラムが燃える闘志を照らし、記録も残して自分の進化をキメることができるぞ。
            </p>
          </div>
          <div className="landing-cta">
            <button type="button" className="btn primary btn-start btn-start--default" onClick={handleDefaultStart}>
              <span className="btn__label">セッションを開始</span>
            </button>
            <button type="button" className="btn ghost btn-start btn-start--custom" onClick={handleCustomStart}>
              <span className="btn__label">カスタマイズセッション</span>
            </button>
          </div>
        </header>

        <section className="landing-highlights">
          <div className="highlight-card">
            <h2>デッキで決まる筋トレセッション</h2>
            <p>カードの出目で種目と回数が即決。キングなら22回のボーナスレップでラストまでド派手に燃やせる！</p>
          </div>
          <div className="highlight-card">
            <h2>音と光で追い込みモード</h2>
            <p>クラブテイストのスペクトラムがリアルタイムで躍動。テンション高めのラップ調メッセージが背中を押す。</p>
          </div>
          <div className="highlight-card">
            <h2>履歴も進捗も一元管理</h2>
            <p>累計回数やドローログ、残りカードを可視化。セッション後はリザルトページで成果を振り返ろう！</p>
          </div>
        </section>
      </main>
    </>
  );
};
