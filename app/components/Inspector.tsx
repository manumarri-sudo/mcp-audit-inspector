"use client";
import { useState } from "react";
import { useInspector } from "./useInspector";
import { SAMPLES, TIER_COPY, renderInline, buildAgentReading } from "./InspectorSupport";
import { ScoreCanvas } from "./ScoreCanvas";

export const Inspector = () => {
  const [input, setInput] = useState<string>(SAMPLES[0]!.text);
  const [activeId, setActiveId] = useState<string>(SAMPLES[0]!.id);
  const { diff, scan, loading, error } = useInspector(input);

  const sample = SAMPLES.find((s) => s.id === activeId);
  const finding = scan?.servers.flatMap((server) => server.findings)
    .reduce<(NonNullable<typeof scan>["servers"][number]["findings"][number]) | undefined>(
      (worst, current) => !worst || current.score < worst.score ? current : worst, undefined);
  const score = scan?.summary?.score ?? null;
  const tier = scan?.summary?.tier ?? "pending";
  const agentReading = diff && diff.hidden.length > 0 ? buildAgentReading(input) : null;

  return (
    <section className="inspector">
      <p className="inspector-label">
        <span>Step 1 / pick an example to see how it works</span>
      </p>
      <div className="sample-cards">
        {SAMPLES.map((s) => (
          <button
            key={s.id}
            className={`sample-card ${activeId === s.id ? "active" : ""}`}
            onClick={() => {
              setInput(s.text);
              setActiveId(s.id);
            }}
            type="button"
          >
            <span className="sample-card-icon">{s.icon}</span>
            <div className="sample-card-name">{s.label}</div>
            <div className="sample-card-hint">{s.hint}</div>
          </button>
        ))}
      </div>

      <p className="muted">Pasted text is sent automatically to this site's server for analysis. Use a local instance for private material, and do not paste credentials.</p>
      <div className="inspector-input-row">
        <p className="inspector-label">
          <span>Step 2 / or paste your own text</span>
          <button
            type="button"
            className="inspector-label-action"
            onClick={() => {
              setInput("");
              setActiveId("custom");
            }}
          >
            Clear
          </button>
        </p>
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setActiveId("custom");
          }}
          spellCheck={false}
          className="inspector-textarea"
          placeholder="Paste any tool description, raw text, or a tools/list JSON response..."
        />
      </div>

      <p className="inspector-label">
        <span>Result / what the eye sees, what the model reads, the risk score</span>
        {loading ? <span className="inspector-spinner" /> : null}
      </p>

      <div className="inspector-result">
        <div className="inspector-pane inspector-pane-diff">
          <div className="inspector-pane-header">
            <span className="dot dot-fg" />
            What you see
            <span className="inspector-pane-meta">
              {diff?.visible_length ?? input.length} chars
            </span>
          </div>
          <div className="inspector-pane-body">{diff?.visible ?? input}</div>

          <div className="inspector-pane-header" style={{ marginTop: "1.2rem" }}>
            <span className="dot dot-accent" />
            Codepoints in the input
            <span className="inspector-pane-meta">
              +{diff?.hidden_count ?? 0} hidden
              {(diff?.hidden_count ?? 0) === 1 ? " codepoint" : " codepoints"}
            </span>
          </div>
          <div className="inspector-pane-body inspector-pane-body-mono">
            {diff ? renderInline(input, diff.hidden) : input}
          </div>

          {agentReading ? (
            <>
              <div className="inspector-pane-header" style={{ marginTop: "1.2rem" }}>
                <span className="dot dot-warn" />
                Tag characters decoded for inspection
              </div>
              <div className="inspector-pane-body inspector-pane-body-prose">
                {agentReading}
              </div>
            </>
          ) : null}
        </div>

        <div className="inspector-pane inspector-pane-score">
          {score !== null ? <ScoreCanvas score={score} /> : null}
          <div className="inspector-score-num">{score ?? "..."}</div>
          <div>
            <span className={`tier-badge tier-${tier}`}>{score === null ? (loading ? "Analyzing" : "Not scored") : tier}</span>
          </div>
          <p className="inspector-score-explainer">{error || TIER_COPY[tier] || "Paste a tool description to begin."}</p>
          {finding ? <p className="muted">Lowest-scoring tool: {finding.tool_name || "pasted text"}</p> : null}
          {finding && finding.deductions.length > 0 ? (
            <ul className="inspector-deductions">
              {finding.deductions.map((d, i) => (
                <li key={i}>
                  <span>{d.reason}</span>
                  <code>-{d.points}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ fontSize: "0.88rem", margin: "0.6rem 0 0" }}>
              {scan ? "No deductions from these checks." : "No completed scan."}
            </p>
          )}
        </div>
      </div>

      {sample && activeId !== "custom" ? (
        <p className="inspector-caption">{sample.caption}</p>
      ) : null}
    </section>
  );
};
