import { useEffect } from 'react';
import type { RefObject } from 'react';

export function useSimpleSpectrum(canvasRef: RefObject<HTMLCanvasElement | null>, bars = 48) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame = 0;

    const drawFrame = (time: number) => {
      const { innerWidth: width, innerHeight: height } = window;
      ctx.clearRect(0, 0, width, height);
      const baseGradient = ctx.createLinearGradient(0, height, width, 0);
      baseGradient.addColorStop(0, 'rgba(9, 0, 40, 0.9)');
      baseGradient.addColorStop(1, 'rgba(28, 0, 55, 0.9)');
      ctx.fillStyle = baseGradient;
      ctx.fillRect(0, 0, width, height);

      const barWidth = width / (bars * 1.3);
      const centerX = width / 2;
      const hueBase = (time / 60) % 360;

      for (let i = 0; i < bars; i += 1) {
        const offset = i * barWidth * 1.3;
        const h = Math.sin(time / 1200 + i * 0.35) * 0.4 + 0.6;
        const magnitude = Math.abs(h);
        const barHeight = height * 0.45 * magnitude + 60;
        const hue = (hueBase + i * 6) % 360;
        const colorTop = `hsla(${(hue + 20) % 360}, 85%, 65%, 0.6)`;
        const colorBottom = `hsla(${hue}, 80%, 45%, 0.25)`;
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, colorTop);
        gradient.addColorStop(1, colorBottom);

        const leftX = centerX - offset - barWidth;
        const rightX = centerX + offset;

        ctx.fillStyle = gradient;
        ctx.fillRect(leftX, height - barHeight, barWidth, barHeight);
        ctx.fillRect(rightX, height - barHeight, barWidth, barHeight);
      }

      animationFrame = requestAnimationFrame(drawFrame);
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { innerWidth: width, innerHeight: height } = window;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      animationFrame = requestAnimationFrame(drawFrame);
    };

    const stopAnimation = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pagehide', stopAnimation);

    return () => {
      stopAnimation();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pagehide', stopAnimation);
    };
  }, [bars, canvasRef]);
}
