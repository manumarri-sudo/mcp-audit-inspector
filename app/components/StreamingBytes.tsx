"use client";

import { useEffect, useRef } from "react";

/**
 * Background canvas that animates streaming Unicode codepoints.
 *
 * Most chars in the stream are visible Latin / katakana / digits in cyan.
 * A small fraction are tag-block chars (U+E0000..U+E007F), which the model
 * reads but renders as nothing in normal UI - we render their hex form
 * (U+E0xx) in magenta to make the metaphor visible.
 *
 * Lightweight 2D canvas, no library. Pauses when the tab is hidden or the
 * user prefers reduced motion.
 */

const VISIBLE_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789{}<>[]/=*+-_:;.,";
const TAG_GLYPHS = (() => {
  const out: string[] = [];
  for (let cp = 0xe0041; cp <= 0xe005a; cp += 1) {
    out.push(`U+${cp.toString(16).toUpperCase()}`);
  }
  return out;
})();

const VISIBLE_COLOR = "rgba(0, 217, 255, ";
const HIDDEN_COLOR = "rgba(255, 45, 146, ";

interface Column {
  x: number;
  y: number;
  speed: number;
  glyphs: { ch: string; isHidden: boolean }[];
  fontSize: number;
}

const buildColumn = (x: number, height: number, fontSize: number): Column => {
  const length = 8 + Math.floor(Math.random() * 18);
  const glyphs: { ch: string; isHidden: boolean }[] = [];
  for (let i = 0; i < length; i += 1) {
    const isHidden = Math.random() < 0.08;
    if (isHidden) {
      glyphs.push({
        ch: TAG_GLYPHS[Math.floor(Math.random() * TAG_GLYPHS.length)]!,
        isHidden: true,
      });
    } else {
      glyphs.push({
        ch: VISIBLE_GLYPHS[Math.floor(Math.random() * VISIBLE_GLYPHS.length)]!,
        isHidden: false,
      });
    }
  }
  return {
    x,
    y: -Math.random() * height,
    speed: 0.4 + Math.random() * 1.4,
    glyphs,
    fontSize,
  };
};

export const StreamingBytes = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      canvas.style.display = "none";
      return;
    }

    let columns: Column[] = [];
    let running = true;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cssWidth = 0;
    let cssHeight = 0;

    const resize = () => {
      cssWidth = window.innerWidth;
      cssHeight = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      ctx.scale(dpr, dpr);

      const fontSize = cssWidth < 720 ? 14 : 16;
      const colWidth = fontSize * 5.4;
      const colCount = Math.ceil(cssWidth / colWidth);
      columns = [];
      for (let i = 0; i < colCount; i += 1) {
        columns.push(buildColumn(i * colWidth + 12, cssHeight, fontSize));
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const onVisibility = () => {
      running = !document.hidden;
      if (running) loop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    let lastTime = performance.now();

    const draw = (delta: number) => {
      ctx.fillStyle = "rgba(10, 10, 15, 0.18)";
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      ctx.font = `400 14px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textBaseline = "top";

      for (const col of columns) {
        col.y += col.speed * delta * 0.06;
        const lineHeight = col.fontSize * 1.4;

        for (let i = 0; i < col.glyphs.length; i += 1) {
          const g = col.glyphs[i]!;
          const yPos = col.y + i * lineHeight;
          if (yPos < -lineHeight || yPos > cssHeight + lineHeight) continue;

          const fadePos = i / col.glyphs.length;
          const alpha = (1 - fadePos) * 0.85;
          const isLeader = i === 0;

          if (g.isHidden) {
            ctx.font = `500 ${col.fontSize - 2}px "JetBrains Mono", ui-monospace, monospace`;
            ctx.fillStyle = HIDDEN_COLOR + (alpha * 1.2).toFixed(3) + ")";
          } else {
            ctx.font = `400 ${col.fontSize}px "JetBrains Mono", ui-monospace, monospace`;
            ctx.fillStyle = VISIBLE_COLOR + (isLeader ? 1 : alpha).toFixed(3) + ")";
          }

          ctx.fillText(g.ch, col.x, yPos);
        }

        const totalHeight = col.glyphs.length * (col.fontSize * 1.4);
        if (col.y > cssHeight + 40) {
          col.y = -totalHeight - Math.random() * 200;
          col.speed = 0.4 + Math.random() * 1.4;
          for (let i = 0; i < col.glyphs.length; i += 1) {
            const isHidden = Math.random() < 0.08;
            if (isHidden) {
              col.glyphs[i] = {
                ch: TAG_GLYPHS[Math.floor(Math.random() * TAG_GLYPHS.length)]!,
                isHidden: true,
              };
            } else {
              col.glyphs[i] = {
                ch: VISIBLE_GLYPHS[Math.floor(Math.random() * VISIBLE_GLYPHS.length)]!,
                isHidden: false,
              };
            }
          }
        }
      }
    };

    const loop = () => {
      if (!running) return;
      const now = performance.now();
      const delta = Math.min(now - lastTime, 64);
      lastTime = now;
      draw(delta);
      requestAnimationFrame(loop);
    };

    loop();

    return () => {
      running = false;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="streaming-canvas" aria-hidden="true" />;
};
