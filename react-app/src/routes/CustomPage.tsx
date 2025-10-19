import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VALID_CUSTOM_MAX } from '../lib/deck';
import { loadSessionSettings, saveSessionSettings } from '../lib/sessionStorage';
import { usePageSetup } from '../hooks/usePageSetup';
import type { FormEvent } from 'react';
import { AUTO_UNMUTE_FLAG_KEY } from '../lib/constants';
import { useGlobalAudioRef } from '../context/AudioProvider';
import { primeAudioGraphFromGesture } from '../hooks/useTrainingAudio';

export const CustomPage = () => {
  usePageSetup('custom', 'カスタムセッション - トランプマスキュラー');
  const navigate = useNavigate();
  const settings = loadSessionSettings();
  const audioRef = useGlobalAudioRef();
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
    <main className="app app--custom">
      <header className="hero hero--compact">
        <div>
          <p className="tag">Deck Remix</p>
          <h1>カスタムセッション設定</h1>
          <p className="lead">
            最大レップ値を選んで自分に合った強度をカスタマイズ！キングはいつだって13回で固定だ。セッション開始後はその設定がキミの限界を刺激するぜ。
          </p>
        </div>
      </header>

      <form className="custom" onSubmit={handleSubmit}>
        <fieldset>
          <legend>最大レップを選択</legend>
          <div className="custom__options">
            {VALID_CUSTOM_MAX.map((value) => (
              <label key={value} className="custom__radio">
                <input
                  type="radio"
                  name="max"
                  value={value}
                  checked={selected === value}
                  onChange={() => setSelected(value)}
                />
                <span>{value} レップ</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="custom__actions">
          <button type="submit" className="btn primary">
            <span className="btn__label">セッション開始</span>
          </button>
          <button type="button" className="btn ghost" onClick={() => navigate('/')}>TOPへ戻る</button>
        </div>
      </form>
    </main>
  );
};
