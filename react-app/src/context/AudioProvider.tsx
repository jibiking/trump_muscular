import { createContext, useContext, useRef, type MutableRefObject, type ReactNode } from 'react';

const AudioRefContext = createContext<MutableRefObject<HTMLAudioElement | null> | null>(null);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  return (
    <AudioRefContext.Provider value={audioRef}>
      <>
        <audio
          ref={audioRef}
          id="bg-music"
          src="/bee.mp3"
          preload="auto"
          loop
          playsInline
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        />
        {children}
      </>
    </AudioRefContext.Provider>
  );
};

export const useGlobalAudioRef = () => {
  const ctx = useContext(AudioRefContext);
  if (!ctx) {
    throw new Error('useGlobalAudioRef must be used within an AudioProvider');
  }
  return ctx;
};
