"use client";

import { useEffect, useRef } from "react";

/**
 * Thin horizontal strip behind the hero showing visible Latin chars
 * scrolling left-to-right with the occasional U+E0xx tag-block char in
 * pink. Contained, slow, decorative — reinforces the metaphor without
 * dominating the page.
 */

const VISIBLE_GLYPHS = "{}<>[]/=*+-_:;.,abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const TAG_GLYPHS = (() => {
  const out: string[] = [];
  for (let cp = 0xe0041; cp <= 0xe005a; cp += 1) {
    out.push(`U+${cp.toString(16).toUpperCase()}`);
  }
  return out;
})();

const FG = "rgba(107, 101, 87, 0.55)";
const ACCENT = "rgba(214, 44, 110, 0.85)";

interface Token {
  ch: string;
  isHidden: boolean;
  x: number;
  speed: number;
}

const buildToken = (x: number): Token => {
  const isHidden = Math.random() < 0.07;
  return {
    ch: isHidden
      ? TAG_GLYPHS[Math.floor(Math.random() * TAG_GLYPHS.length)]!
      : VISIBLE_GLYPHS[Math.floor(Math.random() * VISIBLE_GLYPHS.length)]!,
    isHidden,
    x,
    speed: 0.18 + Math.random() * 0.18,
  };
};

export const HeroByteStrip = () => {
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
    let tokens: Token[] = [];
    let running = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      tokens = [];
      let x = 0;
      const colSpacing = 56;
      while (x < cssW + colSpacing * 4) {
        tokens.push(buildToken(x));
        x += colSpacing;
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
      ctx.font = "500 13px JetBrains Mono, ui-monospace, monospace";
      ctx.textBaseline = "middle";

      const y = cssH / 2;
      for (const t of tokens) {
        t.x -= t.speed * delta * 0.06;
        if (t.x < -80) {
          const farthest = tokens.reduce((m, x) => (x.x > m ? x.x : m), -Infinity);
          Object.assign(t, buildToken(farthest + 56));
        }
        ctx.fillStyle = t.isHidden ? ACCENT : FG;
        if (t.isHidden) {
          ctx.font = "600 11px JetBrains Mono, ui-monospace, monospace";
        } else {
          ctx.font = "500 13px JetBrains Mono, ui-monospace, monospace";
        }
        ctx.fillText(t.ch, t.x, y);
      }
      requestAnimationFrame(loop);
    };
    loop();

    return () => {
      running = false;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" />;
};
