/**
 * Parse pasted Claude Desktop config or MCP server JSON.
 *
 * Accepted shapes:
 *   1. Full claude_desktop_config.json: { mcpServers: { name: { command, args, env? } } }
 *   2. A single tools/list response: { tools: [{name, description, inputSchema}] }
 *   3. Raw text pasted in (treated as a single tool description for /api/diff)
 */

export interface ParsedServer {
  name: string;
  source: "claude_desktop_config" | "tools_list" | "raw";
  command?: string;
  tools?: ParsedTool[];
  rawDescription?: string;
}

export interface ParsedTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export interface ParseResult {
  ok: boolean;
  shape: "claude_desktop_config" | "tools_list" | "raw" | "unknown";
  servers: ParsedServer[];
  warnings: string[];
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

export const parseConfig = (input: string): ParseResult => {
  const warnings: string[] = [];
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return { ok: false, shape: "unknown", servers: [], warnings: ["empty input"] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      ok: true,
      shape: "raw",
      servers: [{ name: "raw_text", source: "raw", rawDescription: trimmed }],
      warnings,
    };
  }

  if (!isObject(parsed)) {
    return {
      ok: false,
      shape: "unknown",
      servers: [],
      warnings: ["JSON root must be an object"],
    };
  }

  if (isObject(parsed["mcpServers"])) {
    const mcpServers = parsed["mcpServers"] as Record<string, unknown>;
    const servers: ParsedServer[] = [];
    for (const [name, raw] of Object.entries(mcpServers)) {
      if (!isObject(raw)) {
        warnings.push(`server ${name} is not an object`);
        continue;
      }
      const command = typeof raw["command"] === "string" ? (raw["command"] as string) : undefined;
      servers.push({
        name,
        source: "claude_desktop_config",
        ...(command !== undefined ? { command } : {}),
      });
    }
    return { ok: true, shape: "claude_desktop_config", servers, warnings };
  }

  if (Array.isArray(parsed["tools"])) {
    const tools = (parsed["tools"] as unknown[]).filter(isObject) as Record<string, unknown>[];
    const parsedTools: ParsedTool[] = tools.map((t) => ({
      name: typeof t["name"] === "string" ? (t["name"] as string) : "",
      description: typeof t["description"] === "string" ? (t["description"] as string) : "",
      ...(isObject(t["inputSchema"]) ? { inputSchema: t["inputSchema"] as Record<string, unknown> } : {}),
    }));
    return {
      ok: true,
      shape: "tools_list",
      servers: [{ name: "pasted", source: "tools_list", tools: parsedTools }],
      warnings,
    };
  }

  return {
    ok: false,
    shape: "unknown",
    servers: [],
    warnings: [
      "did not recognize JSON shape; expected either { mcpServers: ... } or { tools: [...] }",
    ],
  };
};
