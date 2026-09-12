# MCP Audit Inspector

A web inspector for suspicious patterns in MCP tool descriptions. Paste a description or a nonempty `tools/list` response to inspect hidden Unicode, instruction-like language, schema mismatches and a heuristic risk score.

## What works

- Highlights invisible Unicode, bidirectional controls and Latin lookalikes.
- Checks instruction tags, imperative language, consent-bypass phrasing, conversation-capture signals and description/schema mismatches.
- Decodes candidate base64 and hexadecimal strings for further pattern checks.
- Scans descriptions inside input schemas as well as the main tool description.
- Shows findings and score deductions alongside the text.

The detector lives in `lib/detectors.ts`, parsing in `lib/parse_config.ts`, and scoring in `lib/score.ts`. The methodology page explains the implemented rules and score thresholds.

## Privacy

**The inspector sends pasted text to this app's server**, through `/api/diff` and `/api/scan`; it is not a browser-only scanner. On a hosted instance, that means the hosting service processes the text. Run locally for private material, and do not paste API keys, passwords or credential-bearing connection configurations.

The scan handlers perform local pattern matching and do not invoke an LLM or connect to the described MCP servers. A connection configuration alone is rejected because it does not provide the actual tool descriptions.

## Run locally

Requires Node.js 20 or later.

```bash
git clone https://github.com/manumarri-sudo/mcp-audit-inspector.git
cd mcp-audit-inspector
npm ci
npm run dev
```

Open `http://localhost:3000`, or build and start the production version:

```bash
npm run build
npm start
```

## Checks

```bash
npm test
npm run typecheck
```

Tests cover detection behavior and the boundary between completed scans, unsupported input and failed requests. A failed scan must not be displayed as a clean score.

## Interpretation and limits

Scores and tier thresholds are project heuristics, not probabilities or a security certification. A finding can be a legitimate instruction, while a clean result can miss an attack. Whether a model follows a description depends on its context, permissions and behavior.

This tool does not execute an attack, prove exfiltration, establish a vendor's intent, or monitor an installed server for changes. It does not fetch live descriptions from connection configurations. The historical research notes are not a fresh assessment of current vendors.

## Project status

A working research tool with a Next.js/React interface and TypeScript detectors. It is useful for inspecting descriptions and reviewing patterns, with human interpretation required before a security conclusion.

Built with assistance from Claude (Anthropic).

## Publication scope

This is the standalone inspector extracted from the MCP Audit project on September 12, 2026. The research drafts, historical corpus claims, internal scripts and original repository history are not part of this publication. There is no live hosted service included.
