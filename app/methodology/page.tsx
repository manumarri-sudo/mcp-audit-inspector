import Link from "next/link";

export const metadata = {
  title: "Scoring and limitations - MCP Audit Inspector",
  description: "The implemented heuristic score and its limits.",
};

export default function MethodologyPage() {
  return (
    <main className="container">
      <h1>How the inspector scores text</h1>
      <p className="lede">
        Each completed tool scan starts at 100 and subtracts weighted pattern
        matches, with a floor of zero. Weights and thresholds are project
        heuristics, not measured probabilities or validated exploit rates.
      </p>
      <h2>Implemented deductions</h2>
      <ul>
        <li>Hidden Unicode or description/schema mismatch: 30 points each.</li>
        <li>Multiple line-jumping signals or consent-bypass language: 25 points each.</li>
        <li>Conversation capture, multiple commandeering patterns, exfiltration patterns or instruction tags: 20 points each.</li>
        <li>Latin lookalike characters: 15 points.</li>
        <li>Encoded payloads or forward references: 10 points each.</li>
        <li>A single manipulation pattern: 5 points.</li>
      </ul>
      <p>
        The tier is clean at 95 or above, minor at 80, concerning at 60, high at
        30, and critical below 30. These are code labels: even a clean score does
        not certify safety. The implementation is in lib/score.ts and lib/detectors.ts.
      </p>
      <h2>What a finding means</h2>
      <p>
        A pattern match is a review lead. Schema mismatch does not prove that a
        handler accepts or rejects an argument, and a suspicious instruction does
        not prove that a model will follow it. Runtime behavior depends on the
        client, model, permissions and context; this scanner does not test those.
      </p>
      <h2>Data handling and coverage</h2>
      <p>
        Text is sent to this application's server for analysis. The scan handlers
        use local pattern matching and do not contact described MCP servers.
        Run locally for private material, and never paste credentials. Missing
        descriptions and failed requests produce no completed score.
      </p>
      <p>
        False positives and false negatives are possible. This publication does
        not include a historical research corpus or reproduce ecosystem-wide findings.
      </p>
      <p><Link href="/">Return to the inspector</Link></p>
    </main>
  );
}
