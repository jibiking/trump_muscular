import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { AUTO_UNMUTE_FLAG_KEY } from '../lib/constants';

export interface AudioPauseSnapshot {
  wasPlaying: boolean;
  spectrumRunning: boolean;
}

const getAudioContextClass = () => {
  if (typeof window === 'undefined') return undefined;
  const AnyWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  return AnyWindow.AudioContext || AnyWindow.webkitAudioContext;
};

type AudioGraph = {
  context: AudioContext;
  analyser: AnalyserNode;
  source: MediaElementAudioSourceNode;
  dataArray: Uint8Array<ArrayBuffer>;
};

const AUDIO_GRAPH_SYMBOL = Symbol('trump-muscular:audio-graph');

type EnhancedAudioElement = HTMLAudioElement & {
  [AUDIO_GRAPH_SYMBOL]?: AudioGraph;
};

function getOrCreateAudioGraph(audio: EnhancedAudioElement): AudioGraph | null {
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) return null;
  const existing = audio[AUDIO_GRAPH_SYMBOL];
  if (existing) {
    return existing;
  }
  const context = new AudioContextClass();
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.78;
  const source = context.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(context.destination);
  const dataArray = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
  const graph: AudioGraph = {
    context,
    analyser,
    source,
    dataArray
  };
  audio[AUDIO_GRAPH_SYMBOL] = graph;
  return graph;
}

export async function primeAudioGraphFromGesture(audio: HTMLAudioElement) {
  const graph = getOrCreateAudioGraph(audio as EnhancedAudioElement);
  audio.volume = 0.65;
  audio.loop = true;
  audio.playbackRate = 1.2;
  audio.setAttribute('playsinline', '');
  audio.muted = false;
  if (graph?.context.state === 'suspended') {
    try {
      await graph.context.resume();
    } catch (error) {
      /* ignore */
    }
  }
  try {
    await audio.play();
  } catch (error) {
    throw error;
  }
}

export interface TrainingAudioControls {
  musicReady: boolean;
  soundMuted: boolean;
  desiredMuted: boolean;
  toggleSound: () => void;
  setDesiredMuted: (muted: boolean) => void;
  applySoundState: () => Promise<void>;
  pauseForSummary: () => AudioPauseSnapshot;
  resumeFromSummary: (snapshot: AudioPauseSnapshot) => void;
  stop: (clearSpectrum?: boolean) => void;
}

interface SpectrumMeta {
  width: number;
  height: number;
  gradient: CanvasGradient | null;
  barCount: number;
}

export function useTrainingAudio(
  audioRef: RefObject<HTMLAudioElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>
): TrainingAudioControls {
  const initialAutoUnmute =
    typeof window !== 'undefined' && sessionStorage.getItem(AUTO_UNMUTE_FLAG_KEY) === '1';

  const [musicReady, setMusicReady] = useState(false);
  const [soundMuted, setSoundMuted] = useState(() => !initialAutoUnmute);
  const [desiredMuted, setDesiredMuted] = useState(() => !initialAutoUnmute);

  const musicReadyRef = useRef(false);
  const autoUnmuteRef = useRef(initialAutoUnmute);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const spectrumMetaRef = useRef<SpectrumMeta>({ width: 0, height: 0, gradient: null, barCount: 80 });

  useEffect(() => {
    if (autoUnmuteRef.current) {
      sessionStorage.removeItem(AUTO_UNMUTE_FLAG_KEY);
      autoUnmuteRef.current = false;
    }
  }, []);

  const clearAnimationFrame = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const primeSpectrumCanvas = useCallback(() => {
    const ctx = canvasCtxRef.current;
    const meta = spectrumMetaRef.current;
    if (!ctx || !meta.width || !meta.height) return;
    ctx.fillStyle = 'rgba(5, 0, 26, 0.9)';
    ctx.fillRect(0, 0, meta.width, meta.height);
    if (meta.gradient) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = meta.gradient;
      ctx.fillRect(0, 0, meta.width, meta.height);
      ctx.restore();
    }
  }, []);

  const stopSpectrumAnimation = useCallback(
    (clear = false) => {
      clearAnimationFrame();
      if (clear) {
        primeSpectrumCanvas();
      }
    },
    [clearAnimationFrame, primeSpectrumCanvas]
  );

  const drawSpectrumFrame = useCallback(() => {
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    const ctx = canvasCtxRef.current;
    const meta = spectrumMetaRef.current;
    if (!analyser || !dataArray || !ctx || !meta.width || !meta.height) return;

    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = 'rgba(5, 0, 26, 0.25)';
    ctx.fillRect(0, 0, meta.width, meta.height);

    const halfBars = Math.floor(meta.barCount / 2);
    const step = Math.max(1, Math.floor(dataArray.length / halfBars));
    const barWidth = Math.max(2, meta.width / (meta.barCount * 1.8));
    const gap = barWidth * 0.45;
    const centerX = meta.width / 2;
    const baseY = meta.height * 0.6;
    const maxBarHeight = meta.height * 0.55;

    if (meta.gradient) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = meta.gradient;
      ctx.fillRect(0, 0, meta.width, meta.height);
      ctx.restore();
    }

    const time = performance.now();
    const hueBase = (time / 35) % 360;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < halfBars; i += 1) {
      const dataIndex = Math.min(dataArray.length - 1, i * step);
      const magnitude = dataArray[dataIndex] / 255;
      const barHeight = Math.max(10, magnitude * maxBarHeight);
      const offset = i * (barWidth + gap);
      const leftX = centerX - offset - barWidth;
      const rightX = centerX + offset;

      const hue = (hueBase + i * 7) % 360;
      const saturation = 70 + magnitude * 28;
      const lightnessBottom = 42 + magnitude * 28;
      const lightnessTop = Math.min(88, lightnessBottom + 18);
      const alpha = 0.55 + magnitude * 0.35;

      const gradientBottom = `hsla(${(hue + 12) % 360}, ${Math.min(100, saturation + 10).toFixed(1)}%, ${Math.min(75, lightnessBottom).toFixed(1)}%, ${(alpha * 0.85).toFixed(2)})`;
      const gradientMid = `hsla(${(hue + 32) % 360}, ${Math.min(100, saturation + 24).toFixed(1)}%, ${Math.min(82, lightnessTop).toFixed(1)}%, ${alpha.toFixed(2)})`;
      const gradientTop = `hsla(${(hue + 58) % 360}, ${Math.min(100, saturation + 32).toFixed(1)}%, ${Math.min(90, lightnessTop + 6).toFixed(1)}%, ${(alpha * 0.9).toFixed(2)})`;

      const barGradient = ctx.createLinearGradient(leftX, baseY + barHeight, leftX, baseY - barHeight);
      barGradient.addColorStop(0, gradientBottom);
      barGradient.addColorStop(0.45, gradientMid);
      barGradient.addColorStop(1, gradientTop);

      ctx.shadowColor = `hsla(${(hue + 18) % 360}, 95%, 70%, ${(0.28 + magnitude * 0.4).toFixed(2)})`;
      ctx.shadowBlur = 14 + magnitude * 28;
      ctx.fillStyle = barGradient;
      ctx.fillRect(leftX, baseY - barHeight, barWidth, barHeight * 2);
      ctx.fillRect(rightX, baseY - barHeight, barWidth, barHeight * 2);
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(0, baseY, meta.width, 1.5);

    animationFrameRef.current = requestAnimationFrame(drawSpectrumFrame);
  }, []);

  const startSpectrumAnimation = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser || !canvasCtxRef.current) return;
    if (!dataArrayRef.current || dataArrayRef.current.length !== analyser.frequencyBinCount) {
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    }
    if (animationFrameRef.current) return;
    animationFrameRef.current = requestAnimationFrame(drawSpectrumFrame);
  }, [drawSpectrumFrame]);

  const ensureAudioGraph = useCallback(() => {
    const audio = audioRef.current as EnhancedAudioElement | null;
    if (!audio) return;
    const graph = getOrCreateAudioGraph(audio);
    if (!graph) return;
    audioContextRef.current = graph.context;
    analyserRef.current = graph.analyser;
    sourceRef.current = graph.source;
    dataArrayRef.current = graph.dataArray;
  }, [audioRef]);

  const ensureAudioContextRunning = useCallback(() => {
    const context = audioContextRef.current;
    if (!context) return Promise.resolve();
    if (context.state === 'suspended') {
      return context.resume();
    }
    return Promise.resolve();
  }, []);

  const applySoundState = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (desiredMuted) {
      audio.pause();
      setSoundMuted(true);
      stopSpectrumAnimation(true);
      return;
    }
    try {
      ensureAudioGraph();
      const resumePromise = ensureAudioContextRunning();
      const playResult = audio.play();
      audio.playbackRate = 1.2;
      if (playResult instanceof Promise) {
        await Promise.all([resumePromise, playResult]);
      } else {
        await resumePromise;
      }
      musicReadyRef.current = true;
      setMusicReady(true);
      setSoundMuted(false);
      startSpectrumAnimation();
    } catch (error) {
      console.error('音声の再生に失敗しました', error);
      setSoundMuted(true);
      stopSpectrumAnimation(true);
    }
  }, [audioRef, desiredMuted, ensureAudioContextRunning, ensureAudioGraph, startSpectrumAnimation, stopSpectrumAnimation]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.65;
    audio.loop = true;
    audio.playbackRate = 1.2;
    audio.setAttribute('playsinline', '');
    audio.muted = false;

    const markReady = () => {
      if (musicReadyRef.current) return;
      musicReadyRef.current = true;
      setMusicReady(true);
      if (!desiredMuted) {
        void applySoundState();
      }
    };

    if (audio.readyState >= 2) {
      markReady();
    } else {
      audio.addEventListener('canplay', markReady, { once: true });
      audio.addEventListener('loadeddata', markReady, { once: true });
    }

    return () => {
      audio.removeEventListener('canplay', markReady as EventListener);
      audio.removeEventListener('loadeddata', markReady as EventListener);
      audio.pause();
    };
  }, [applySoundState, audioRef, desiredMuted]);

  useEffect(() => {
    void applySoundState();
  }, [applySoundState, desiredMuted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvasCtxRef.current = ctx;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      spectrumMetaRef.current.width = width;
      spectrumMetaRef.current.height = height;
      const gradient = ctx.createLinearGradient(0, height, width, 0);
      gradient.addColorStop(0, 'rgba(255, 75, 160, 0.28)');
      gradient.addColorStop(0.2, 'rgba(255, 210, 70, 0.32)');
      gradient.addColorStop(0.4, 'rgba(80, 240, 255, 0.35)');
      gradient.addColorStop(0.6, 'rgba(120, 90, 255, 0.36)');
      gradient.addColorStop(0.8, 'rgba(255, 70, 200, 0.32)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.26)');
      spectrumMetaRef.current.gradient = gradient;
      primeSpectrumCanvas();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef, primeSpectrumCanvas]);

  useEffect(() => {
    const attemptResume = () => {
      if (desiredMuted) {
        setDesiredMuted(false);
      } else if (soundMuted) {
        void applySoundState();
      }
    };
    window.addEventListener('pointerdown', attemptResume);
    window.addEventListener('touchstart', attemptResume);
    return () => {
      window.removeEventListener('pointerdown', attemptResume);
      window.removeEventListener('touchstart', attemptResume);
    };
  }, [applySoundState, desiredMuted, soundMuted]);

  useEffect(() => () => {
    stopSpectrumAnimation(true);
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.pause();
      } catch (error) {
        /* ignore */
      }
    }
  }, [audioRef, stopSpectrumAnimation]);

  const toggleSound = useCallback(() => {
    setDesiredMuted((prev) => !prev);
  }, []);

  const pauseForSummary = useCallback((): AudioPauseSnapshot => {
    const audio = audioRef.current;
    const wasPlaying = Boolean(audio && !audio.paused && !soundMuted && !desiredMuted);
    if (wasPlaying && audio) {
      try {
        audio.pause();
        setSoundMuted(true);
      } catch (error) {
        /* ignore */
      }
    }
    const spectrumRunning = Boolean(animationFrameRef.current);
    if (spectrumRunning) {
      stopSpectrumAnimation();
    }
    return { wasPlaying, spectrumRunning };
  }, [audioRef, desiredMuted, soundMuted, stopSpectrumAnimation]);

  const resumeFromSummary = useCallback(
    (snapshot: AudioPauseSnapshot) => {
      if (snapshot.wasPlaying) {
        setSoundMuted(true);
        setDesiredMuted(false);
        void applySoundState();
      } else if (snapshot.spectrumRunning && !desiredMuted) {
        startSpectrumAnimation();
      }
    },
    [applySoundState, desiredMuted, startSpectrumAnimation]
  );

  const stop = useCallback(
    (clear = false) => {
      const audio = audioRef.current;
      if (audio) {
        try {
          audio.pause();
        } catch (error) {
          /* ignore */
        }
      }
      setSoundMuted(true);
      stopSpectrumAnimation(clear);
    },
    [audioRef, stopSpectrumAnimation]
  );

  return useMemo(
    () => ({
      musicReady,
      soundMuted,
      desiredMuted,
      toggleSound,
      setDesiredMuted,
      applySoundState,
      pauseForSummary,
      resumeFromSummary,
      stop
    }),
    [applySoundState, desiredMuted, musicReady, pauseForSummary, resumeFromSummary, soundMuted, stop, toggleSound]
  );
}
