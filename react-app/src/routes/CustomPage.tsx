import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VALID_CUSTOM_MAX } from '../lib/deck';
import { loadSessionSettings, saveSessionSettings } from '../lib/sessionStorage';
import { usePageSetup } from '../hooks/usePageSetup';
import { useSimpleSpectrum } from '../hooks/useSimpleSpectrum';
import type { FormEvent } from 'react';
import { AUTO_UNMUTE_FLAG_KEY } from '../lib/constants';
import { useGlobalAudioRef } from '../context/AudioProvider';
import { primeAudioGraphFromGesture } from '../hooks/useTrainingAudio';

export const CustomPage = () => {
  usePageSetup('custom', 'カスタムセッション - トランプマスキュラー');
  const navigate = useNavigate();
  const settings = loadSessionSettings();
  const audioRef = useGlobalAudioRef();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useSimpleSpectrum(canvasRef);
  const [selected, setSelected] = useState<number | null>(
    settings.mode === 'custom' ? settings.maxValue : null
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selected) {
        alert('最大レップを選択してくれブラザー！');
        return;
      }
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
      saveSessionSettings({ mode: 'custom', maxValue: selected });
      navigate('/training');
    },
    [audioRef, navigate, selected]
  );

  return (
    <>
      <canvas ref={canvasRef} className="spectrum-canvas" aria-hidden="true" />
      <main className="app app--landing">
        <header className="hero hero--landing">
          <div>
            <p className="tag">Deck Remix</p>
            <h1>カスタマイズセッション</h1>
            <p className="lead lead--landing">
              全スート共通で最大レップをセットして、自分仕様のコンボを刻もう。キングは13回に固定されるぞブラザー！設定後は即プレイだ。
            </p>
          </div>
        </header>

        <form className="custom-form" onSubmit={handleSubmit}>
          <fieldset>
            <legend>最大レップを選択</legend>
            <p className="custom-form__hint">
              数字を選ぶと各スートが 1 からその値までのカード構成になる。キングは 13 回固定。
            </p>
            {VALID_CUSTOM_MAX.map((value) => {
              const totalCards = value * 4;
              return (
                <label key={value} className="custom-option">
                  <input
                    type="radio"
                    name="max"
                    value={value}
                    checked={selected === value}
                    onChange={() => setSelected(value)}
                  />
                  <span>{value} レップ（全{totalCards}枚）</span>
                </label>
              );
            })}
          </fieldset>
          <div className="custom-actions">
            <button type="button" className="btn text" onClick={() => navigate('/')}>
              戻る
            </button>
            <button className="btn primary" type="submit">
              セッション開始
            </button>
          </div>
        </form>
      </main>
    </>
  );
};
