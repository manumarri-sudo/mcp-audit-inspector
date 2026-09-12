"use client";
import { useEffect, useRef } from "react";

export const ScoreCanvas = ({ score }: { score: number }) => {
  const ref = useScoreCanvas(score);
  return <canvas ref={ref} aria-hidden="true" />;
};

const useScoreCanvas = (score: number) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cssW = 0;
    let cssH = 0;
    let running = true;
    let particles: { x: number; y: number; vy: number; alpha: number; size: number }[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const density = score < 60 ? 80 : 36;
      particles = [];
      for (let i = 0; i < density; i += 1) {
        particles.push({
          x: Math.random() * cssW,
          y: Math.random() * cssH,
          vy: 0.05 + Math.random() * 0.18,
          alpha: 0.05 + Math.random() * 0.18,
          size: Math.random() < 0.85 ? 1.5 : 2.5,
        });
      }
    };

    const onVisibility = () => {
      running = !document.hidden;
      if (running) loop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", resize);
    resize();

    let last = performance.now();
    const loop = () => {
      if (!running) return;
      const now = performance.now();
      const delta = Math.min(now - last, 64);
      last = now;
      ctx.clearRect(0, 0, cssW, cssH);
      const colorBase = score < 60 ? "214, 44, 110" : "107, 101, 87";
      for (const p of particles) {
        p.y += p.vy * delta * 0.05;
        if (p.y > cssH + 4) {
          p.y = -4;
          p.x = Math.random() * cssW;
        }
        ctx.fillStyle = `rgba(${colorBase}, ${p.alpha})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      requestAnimationFrame(loop);
    };
    loop();

    return () => {
      running = false;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [score]);

  return ref;
};
