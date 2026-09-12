"use client";

import { useState } from "react";

/**
 * Three-state reveal of a single tool description.
 *
 * State 1 (eyes): plain rendered text, no hidden chars visible.
 * State 2 (model): every char tokenized; hidden chars rendered as their
 *   `U+XXXX` form, highlighted in accent color.
 * State 3 (agent): the actual instruction the agent would receive,
 *   showing the decoded hidden text inline.
 *
 * No auto-motion. The user clicks tabs. Hidden bytes fade in with a single
 * 0.55s animation when they appear.
 */

export interface RevealExample {
  id: string;
  label: string;
  caption: string;
  visibleText: string;
  hiddenChars: { offset: number; codepoint: number; chars?: string }[];
  agentInterpretation: string;
}

const decodeTagBlock = (codepoint: number): string => {
  if (codepoint >= 0xe0021 && codepoint <= 0xe007e) {
    return String.fromCodePoint(codepoint - 0xe0000);
  }
  return "";
};

const renderModelStage = (ex: RevealExample) => {
  const out: { ch: string; isHidden: boolean; key: string; cp?: number }[] = [];
  const hiddenByOffset = new Map<number, { codepoint: number }>();
  for (const h of ex.hiddenChars) hiddenByOffset.set(h.offset, h);
  let i = 0;
  for (const ch of ex.visibleText) {
    const hidden = hiddenByOffset.get(i);
    if (hidden) {
      out.push({
        ch: `U+${hidden.codepoint.toString(16).toUpperCase()}`,
        isHidden: true,
        key: `h${i}`,
        cp: hidden.codepoint,
      });
    }
    out.push({ ch, isHidden: false, key: `c${i}` });
    i += 1;
  }
  return out;
};

const renderAgentStage = (ex: RevealExample) => {
  return ex.agentInterpretation;
};

export const Reveal = ({ examples }: { examples: RevealExample[] }) => {
  const [exampleId, setExampleId] = useState<string>(examples[0]!.id);
  const [stage, setStage] = useState<"eyes" | "model" | "agent">("eyes");
  const example = examples.find((e) => e.id === exampleId) ?? examples[0]!;

  const modelChars = renderModelStage(example);
  const agentText = renderAgentStage(example);

  const hiddenCount = example.hiddenChars.length;
  const visibleLen = example.visibleText.length;

  return (
    <div className="reveal">
      <div className="reveal-tabs">
        {examples.map((ex) => (
          <button
            key={ex.id}
            className={`ghost ${exampleId === ex.id ? "active" : ""}`}
            onClick={() => {
              setExampleId(ex.id);
              setStage("eyes");
            }}
          >
            {ex.label}
          </button>
        ))}
      </div>

      <p className="reveal-caption">{example.caption}</p>

      <div className="reveal-tabs">
        <button
          className={`ghost ${stage === "eyes" ? "active" : ""}`}
          onClick={() => setStage("eyes")}
        >
          1. What you see
        </button>
        <button
          className={`ghost ${stage === "model" ? "active" : ""}`}
          onClick={() => setStage("model")}
        >
          2. What the model reads
        </button>
        <button
          className={`ghost ${stage === "agent" ? "active" : ""}`}
          onClick={() => setStage("agent")}
        >
          3. What the agent acts on
        </button>
      </div>

      {stage === "eyes" && (
        <div className="reveal-stage eyes">{example.visibleText}</div>
      )}

      {stage === "model" && (
        <div className="reveal-stage" key={`model-${example.id}`}>
          {modelChars.map((c) =>
            c.isHidden ? (
              <span
                key={c.key}
                className="char hidden-byte"
                title={`${c.ch} - tag-block char, decodes to "${decodeTagBlock(c.cp ?? 0)}"`}
              >
                {c.ch}
              </span>
            ) : (
              <span key={c.key} className="char">
                {c.ch}
              </span>
            ),
          )}
        </div>
      )}

      {stage === "agent" && (
        <div className="reveal-stage agent">{agentText}</div>
      )}

      <div className="reveal-meta">
        <span>
          <strong>visible to you:</strong> {visibleLen} chars
        </span>
        <span>
          <strong>hidden to you:</strong> {hiddenCount} codepoints
        </span>
        <span>
          <strong>read by model:</strong> {visibleLen + hiddenCount} chars
        </span>
      </div>
    </div>
  );
};
