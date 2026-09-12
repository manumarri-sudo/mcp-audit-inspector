import { NextResponse } from "next/server";
import { scan, scanTool, type StaticFinding } from "@/lib/detectors";
import { parseConfig, type ParsedTool } from "@/lib/parse_config";
import { scoreFinding, type RiskTier } from "@/lib/score";

export const runtime = "edge";

interface ServerReport {
  server_name: string;
  shape: string;
  tool_count: number;
  score: number;
  tier: RiskTier;
  findings: ToolFindingSummary[];
  warnings: string[];
}

interface ToolFindingSummary {
  tool_name: string;
  score: number;
  tier: RiskTier;
  deductions: { reason: string; points: number }[];
  finding: StaticFinding;
}

const summarizeTool = (tool: ParsedTool): ToolFindingSummary => {
  const result = scanTool(tool as unknown as Record<string, unknown>);
  const breakdown = scoreFinding(result.aggregate_finding, tool.description);
  return {
    tool_name: tool.name,
    score: breakdown.score,
    tier: breakdown.tier,
    deductions: breakdown.deductions,
    finding: result.aggregate_finding,
  };
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  }

  const { config } = body as { config?: unknown };

  if (typeof config !== "string") {
    return NextResponse.json(
      { error: "expected { config: string }" },
      { status: 400 },
    );
  }

  if (config.length > 200_000) {
    return NextResponse.json({ error: "config exceeds 200kB limit" }, { status: 413 });
  }

  const parsed = parseConfig(config);

  if (!parsed.ok) {
    return NextResponse.json(
      { error: "could not parse input", warnings: parsed.warnings },
      { status: 400 },
    );
  }

  if (parsed.shape === "claude_desktop_config" || parsed.servers.length === 0 ||
      parsed.servers.some(server => server.source === "tools_list" && (!server.tools?.length || server.tools.some(tool => !tool.description.trim())))) {
    return NextResponse.json({ error: "No tool descriptions were scanned. Paste nonempty tools/list data or a raw tool description; live server fetching is not implemented." }, { status: 422 });
  }

  const reports: ServerReport[] = parsed.servers.map((server) => {
    if (server.source === "raw" && server.rawDescription !== undefined) {
      const { finding } = scan(server.rawDescription);
      const breakdown = scoreFinding(finding, server.rawDescription);
      return {
        server_name: server.name,
        shape: "raw",
        tool_count: 1,
        score: breakdown.score,
        tier: breakdown.tier,
        findings: [
          {
            tool_name: "(raw input)",
            score: breakdown.score,
            tier: breakdown.tier,
            deductions: breakdown.deductions,
            finding,
          },
        ],
        warnings: parsed.warnings,
      };
    }

    if (server.source === "tools_list" && server.tools) {
      const findings = server.tools.map(summarizeTool);
      const minScore = findings.reduce((m, f) => Math.min(m, f.score), 100);
      const tier: RiskTier =
        minScore >= 95 ? "clean" :
          minScore >= 80 ? "minor" :
          minScore >= 60 ? "concerning" :
          minScore >= 30 ? "high" : "critical";
      return {
        server_name: server.name,
        shape: "tools_list",
        tool_count: findings.length,
        score: minScore,
        tier,
        findings,
        warnings: parsed.warnings,
      };
    }

    return {
      server_name: server.name,
      shape: server.source,
      tool_count: 0,
      score: 100,
      tier: "clean",
      findings: [],
      warnings: [
        ...parsed.warnings,
        "claude_desktop_config shape detected. Live tool fetching is not implemented in MVP. Paste a tools/list response or raw tool description for analysis.",
      ],
    };
  });

  const overallScore = reports.reduce((m, r) => Math.min(m, r.score), 100);
  const overallTier: RiskTier =
    overallScore >= 95 ? "clean" :
      overallScore >= 80 ? "minor" :
      overallScore >= 60 ? "concerning" :
      overallScore >= 30 ? "high" : "critical";

  return NextResponse.json({
    summary: {
      shape: parsed.shape,
      server_count: reports.length,
      score: overallScore,
      tier: overallTier,
    },
    servers: reports,
  });
}
