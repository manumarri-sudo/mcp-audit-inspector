/**
 * Static detection passes for MCP tool descriptions.
 *
 * TypeScript port of the Python reference implementation at
 * `~/.claude/projects/invisible-ink/src/static_scan.py`. Behavior must match
 * the Python tests in `tests/detectors.test.ts` (ported from
 * `tests/test_static_scan.py`).
 *
 * Four passes per the methodology brief Section 6:
 *   A. invisible characters (zero-widths, bidi overrides, tag chars, etc.)
 *   B. homoglyphs (Latin lookalikes from Cyrillic, Greek, fullwidth, math)
 *   C. encoded payloads (base64, hex) decoded and rescanned
 *   D. instruction tags + exfiltration verbs + manipulation patterns
 */

export type Range = readonly [number, number];

export const INVISIBLE_RANGES: readonly Range[] = [
  [0x00ad, 0x00ad],   // soft hyphen
  [0x180e, 0x180e],   // mongolian vowel separator
  [0x200b, 0x200d],   // zero-width space / non-joiner / joiner
  [0x2060, 0x2064],   // word joiner + invisible math operators
  [0x2066, 0x2069],   // isolate overrides
  [0x202a, 0x202e],   // bidi overrides
  [0x2028, 0x2029],   // line / paragraph separators
  [0x3164, 0x3164],   // hangul filler
  [0xfeff, 0xfeff],   // BOM / zero-width no-break
  [0x1d173, 0x1d17a], // musical control chars
  [0xe0000, 0xe007f], // tag chars (Unicode Tag block, canonical hidden-instruction vector)
];

export const VARIATION_SELECTOR_RANGE: Range = [0xfe00, 0xfe0f];

const EMOJI_LIKELY_RANGES: readonly Range[] = [
  [0x2300, 0x23ff],   // technical symbols
  [0x2600, 0x27bf],   // misc symbols, dingbats
  [0x2b00, 0x2bff],   // arrows / symbols
  [0x1f000, 0x1f9ff], // emoji plane
  [0x1fa00, 0x1faff], // extended pictographs
];

const COMBINING_MARK_STACK_THRESHOLD = 3;

export const INSTRUCTION_TAG_PATTERNS: readonly string[] = [
  String.raw`<IMPORTANT>`,
  String.raw`<SYSTEM>`,
  String.raw`<\s*system\s*>`,
  String.raw`\[CRITICAL\]`,
  String.raw`\*\*\s*INSTRUCTION\s*\*\*`,
  String.raw`<\s*instructions?\s*>`,
  String.raw`<\s*admin\s*>`,
  String.raw`<\s*override\s*>`,
];

export const ALWAYS_SENSITIVE_TARGETS: readonly string[] = [
  String.raw`~/\.ssh`,
  String.raw`~/\.aws`,
  String.raw`\bid_rsa\b`,
  String.raw`/etc/passwd`,
  String.raw`~/\.bash_history`,
  String.raw`~/\.config/gh`,
];

export const CONTEXT_SENSITIVE_TARGETS: readonly string[] = [
  String.raw`\baccess_token\b`,
  String.raw`\.env\b`,
  String.raw`\bcredentials?\b`,
  String.raw`\bapi[_\-]?key\b`,
  String.raw`\bsecret[_\-]?key\b`,
  String.raw`\bsession[_\-]?token\b`,
];

export const EXFIL_VERBS: readonly string[] = [
  String.raw`\bsend\b`,
  String.raw`\bPOST\b`,
  String.raw`\bfetch\b`,
  String.raw`\btransmit\b`,
  String.raw`\bupload\b`,
  String.raw`\bexfiltrate\b`,
  String.raw`\bforward\b`,
];

export const MANIPULATION_PATTERNS: readonly string[] = [
  String.raw`\binstead of\b`,
  String.raw`\bbefore using\b`,
  String.raw`\balways first\b`,
  String.raw`\balways use this\b`,
  String.raw`\bregardless of\b`,
  String.raw`\bignore (previous|prior)\b`,
  String.raw`\boverride\b`,
  String.raw`\bdo not (tell|mention|inform)\b`,
];

// Line Jumping (Trail of Bits, April 2025): imperatives written at the agent
// that fire the moment the client connects, before user invocation.
export const LINE_JUMPING_PATTERNS: readonly string[] = [
  String.raw`\bMANDATORY\b`,
  String.raw`\bMUST\s+BE\s+CALLED\b`,
  String.raw`\bMUST\s+CALL\b`,
  String.raw`\bMUST\s+USE\b`,
  String.raw`\bMUST\s+INCLUDE\b`,
  String.raw`\bALWAYS\s+(USE|CALL|INVOKE)\b`,
  String.raw`\bNEVER\s+EVER\b`,
  String.raw`\bFIRST\s+STEP\b`,
  String.raw`\bvery\s+first\s+(action|step|call)\b`,
  String.raw`\bas\s+the\s+(very\s+)?first\b`,
  String.raw`\bbefore\s+(any\s+)?other\s+tools?\b`,
  String.raw`\bproactively\s+(call|invoke|use)\b`,
  String.raw`\bautomatically\s+(call|invoke)\b`,
  String.raw`\bWILL\s+FAIL\b`,
];

// Consent bypass: instructions that tell the agent to skip the user.
// Same directive shape that helped a Replit agent delete a production DB.
export const CONSENT_BYPASS_PATTERNS: readonly string[] = [
  String.raw`\bdo\s*n'?t\s+ask\s+(the\s+)?user\b`,
  String.raw`\bdo\s+not\s+ask\s+(the\s+)?user\b`,
  String.raw`\bdo\s*n'?t\s+(prompt|confirm|inform|interrupt)\b`,
  String.raw`\bdo\s+not\s+(prompt|confirm|inform|interrupt)\b`,
  String.raw`\bdo\s*n'?t\s+context\s+switch\b`,
  String.raw`\bskip\s+(the\s+)?(user\s+)?(confirmation|approval|review)\b`,
  String.raw`\bwithout\s+(user\s+)?(consent|approval|confirmation|asking)\b`,
  String.raw`\bno\s+(user\s+)?(confirmation|approval)\s+(needed|required)\b`,
];

// Conversation / prompt exfiltration: parameter names and instructions that
// force the agent to ship the user's input to the vendor's server.
export const CONVERSATION_EXFIL_PATTERNS: readonly string[] = [
  String.raw`\boriginal\s*user\s*message\b`,
  String.raw`\bconversation\s+history\b`,
  String.raw`\bchat\s+(history|log|transcript)\b`,
  String.raw`\bprevious\s+(messages?|prompts?|inputs?)\b`,
  String.raw`\binclude\s+.{0,40}\b(user'?s?\s+(message|prompt)|conversation)\b`,
  String.raw`\bsend\s+.{0,40}\b(user'?s?\s+(message|prompt)|conversation)\b`,
  String.raw`\bpass\s+.{0,40}\b(user'?s?\s+(message|prompt)|full\s+context)\b`,
];

// Schema-mismatch keywords. When the description claims a parameter is
// REQUIRED/MANDATORY but the actual JSON schema's `required` array does not
// list it, that is the canonical Invariant Labs Tool Poisoning Attack pattern.
export const SCHEMA_REQUIRED_CLAIM_RE =
  /\b(MANDATORY|REQUIRED|MUST\s+INCLUDE|MUST\s+CONTAIN|will\s+REJECT)\b[^.]{0,200}?[`"']?([a-zA-Z_][a-zA-Z0-9_]+)[`"']?/gi;

const BASE64_RE =
  /(?<![A-Za-z0-9+/=])(?=[A-Za-z0-9+/]{40,})(?=[^=]*?(?:[+/]|[A-Za-z0-9]{64,}))[A-Za-z0-9+/]{40,}={0,2}(?![A-Za-z0-9+/=])/g;
const HEX_RE = /(?<![0-9a-fA-F])[0-9a-fA-F]{60,}(?![0-9a-fA-F])/g;
const URL_RE = /https?:\/\/\S+/gi;
const COMBINING_MARK_RE = /\p{M}/u;

const CYRILLIC_LOOKALIKES = new Set("асеорхуАВСЕНКМОРТХіїјѕһԁԛԝӏӧӓ");
const GREEK_LOOKALIKES = new Set("ΑΒΕΖΗΙΚΜΝΟΡΤΥΧαοικνρτυηζ");
const FULLWIDTH_LATIN = new Set<string>();
for (let cp = 0xff21; cp <= 0xff3a; cp += 1) FULLWIDTH_LATIN.add(String.fromCodePoint(cp));
for (let cp = 0xff41; cp <= 0xff5a; cp += 1) FULLWIDTH_LATIN.add(String.fromCodePoint(cp));
const MATH_ALPHANUM_LO = 0x1d400;
const MATH_ALPHANUM_HI = 0x1d7ff;

export interface StaticFinding {
  invisible_char_count: number;
  invisible_char_ranges: number[][];
  invisible_char_positions: number[];
  variation_selector_count: number;
  orphan_variation_selectors: number;
  homoglyph_flags: number;
  homoglyph_chars: string[];
  encoded_payloads: number;
  encoded_decoded_preview: string[];
  instruction_tags: string[];
  exfiltration_patterns: string[];
  manipulation_patterns: string[];
  line_jumping_signals: string[];
  consent_bypass_signals: string[];
  conversation_exfil_signals: string[];
  schema_mismatch_fields: string[];
  raw_length: number;
  visible_length: number;
}

const newFinding = (rawLength = 0): StaticFinding => ({
  invisible_char_count: 0,
  invisible_char_ranges: [],
  invisible_char_positions: [],
  variation_selector_count: 0,
  orphan_variation_selectors: 0,
  homoglyph_flags: 0,
  homoglyph_chars: [],
  encoded_payloads: 0,
  encoded_decoded_preview: [],
  instruction_tags: [],
  exfiltration_patterns: [],
  manipulation_patterns: [],
  line_jumping_signals: [],
  consent_bypass_signals: [],
  conversation_exfil_signals: [],
  schema_mismatch_fields: [],
  raw_length: rawLength,
  visible_length: 0,
});

export const isFlagged = (f: StaticFinding): boolean =>
  f.invisible_char_count > 0 ||
  f.instruction_tags.length > 0 ||
  f.exfiltration_patterns.length > 0 ||
  f.manipulation_patterns.length >= 2 ||
  f.encoded_payloads > 0 ||
  (f.homoglyph_flags > 0 && f.raw_length > 40) ||
  f.line_jumping_signals.length >= 2 ||
  f.consent_bypass_signals.length > 0 ||
  f.conversation_exfil_signals.length > 0 ||
  f.schema_mismatch_fields.length > 0;

const inRange = (cp: number, ranges: readonly Range[]): Range | null => {
  for (const r of ranges) if (cp >= r[0] && cp <= r[1]) return r;
  return null;
};

const isEmojiBase = (ch: string): boolean => {
  const cp = ch.codePointAt(0);
  if (cp === undefined) return false;
  return inRange(cp, EMOJI_LIKELY_RANGES) !== null;
};

/**
 * Pass A. Strip true hidden-ink chars. Track variation selectors separately:
 * a single U+FE00..U+FE0F immediately after an emoji base is legitimate and is
 * NOT counted as hidden ink. Orphan variation selectors are still suspicious.
 * Also flags suspicious stacks of combining marks.
 */
export const passA = (text: string, finding: StaticFinding): string => {
  const cleaned: string[] = [];
  const rangesHit = new Set<string>();
  let combiningRun = 0;
  let maxCombiningRun = 0;
  let prevCh: string | null = null;
  let pos = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp >= VARIATION_SELECTOR_RANGE[0] && cp <= VARIATION_SELECTOR_RANGE[1]) {
      finding.variation_selector_count += 1;
      if (prevCh === null || !isEmojiBase(prevCh)) {
        finding.orphan_variation_selectors += 1;
      }
      prevCh = ch;
      pos += 1;
      continue;
    }
    const hit = inRange(cp, INVISIBLE_RANGES);
    if (hit !== null) {
      finding.invisible_char_count += 1;
      finding.invisible_char_positions.push(pos);
      rangesHit.add(`${hit[0]},${hit[1]}`);
      prevCh = ch;
      pos += 1;
      continue;
    }
    if (COMBINING_MARK_RE.test(ch)) {
      combiningRun += 1;
      if (combiningRun > maxCombiningRun) maxCombiningRun = combiningRun;
      cleaned.push(ch);
    } else {
      combiningRun = 0;
      cleaned.push(ch);
    }
    prevCh = ch;
    pos += 1;
  }
  finding.invisible_char_ranges = Array.from(rangesHit)
    .map((s) => s.split(",").map(Number))
    .sort((a, b) => a[0]! - b[0]!);
  if (maxCombiningRun > COMBINING_MARK_STACK_THRESHOLD) {
    finding.invisible_char_count += maxCombiningRun;
  }
  if (finding.orphan_variation_selectors > 0) {
    finding.invisible_char_count += finding.orphan_variation_selectors;
  }
  return cleaned.join("");
};

/**
 * Pass B. Flag chars that render as Latin lookalikes. Skip when the text is
 * not predominantly Latin (avoids false positives on legitimate non-Latin
 * tool descriptions like Russian, Greek, Japanese services).
 */
export const passB = (text: string, finding: StaticFinding): void => {
  if (!text) return;
  let asciiLetters = 0;
  let totalLetters = 0;
  for (const ch of text) {
    const lower = ch.toLowerCase();
    if (lower >= "a" && lower <= "z") asciiLetters += 1;
    if (/\p{L}/u.test(ch)) totalLetters += 1;
  }
  if (totalLetters === 0) return;
  if (asciiLetters / totalLetters < 0.6) return;

  const flagged: string[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (
      CYRILLIC_LOOKALIKES.has(ch) ||
      GREEK_LOOKALIKES.has(ch) ||
      FULLWIDTH_LATIN.has(ch) ||
      (cp >= MATH_ALPHANUM_LO && cp <= MATH_ALPHANUM_HI)
    ) {
      flagged.push(ch);
    }
  }
  if (flagged.length > 0) {
    finding.homoglyph_flags = flagged.length;
    finding.homoglyph_chars = Array.from(new Set(flagged)).sort();
  }
};

const stripUrls = (text: string): string => text.replace(URL_RE, " ");

const decodeBase64 = (raw: string): string | null => {
  const padded = raw + "=".repeat((-raw.length & 3));
  try {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(padded, "base64").toString("utf-8");
    }
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return null;
  }
};

const decodeHex = (raw: string): string | null => {
  if (raw.length % 2 !== 0) return null;
  try {
    const bytes = new Uint8Array(raw.length / 2);
    for (let i = 0; i < raw.length; i += 2) {
      const byte = parseInt(raw.slice(i, i + 2), 16);
      if (Number.isNaN(byte)) return null;
      bytes[i / 2] = byte;
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return null;
  }
};

const PRINTABLE_RE = /[\p{L}\p{N}\p{P}\p{S} \t\n\r]/u;
const printableRatio = (s: string): number => {
  if (s.length === 0) return 0;
  let count = 0;
  for (const ch of s) if (PRINTABLE_RE.test(ch)) count += 1;
  return count / s.length;
};

const rescanDecoded = (decoded: string, finding: StaticFinding): void => {
  for (const pat of INSTRUCTION_TAG_PATTERNS) {
    const re = new RegExp(pat, "gi");
    for (const m of decoded.matchAll(re)) {
      const tag = m[0];
      if (!finding.instruction_tags.includes(tag)) finding.instruction_tags.push(tag);
    }
  }
  for (const pat of ALWAYS_SENSITIVE_TARGETS) {
    if (new RegExp(pat, "i").test(decoded)) {
      if (!finding.exfiltration_patterns.includes(pat)) finding.exfiltration_patterns.push(pat);
    }
  }
  const hasVerb = EXFIL_VERBS.some((v) => new RegExp(v, "i").test(decoded));
  if (hasVerb) {
    for (const pat of CONTEXT_SENSITIVE_TARGETS) {
      if (new RegExp(pat, "i").test(decoded)) {
        if (!finding.exfiltration_patterns.includes(pat)) finding.exfiltration_patterns.push(pat);
      }
    }
  }
};

/**
 * Pass C. Decode base64 / hex blocks and recursively rescan the decoded
 * content for tags and exfil patterns. URLs are stripped first so their
 * path tails do not register as base64.
 */
export const passC = (text: string, finding: StaticFinding): void => {
  const scrubbed = stripUrls(text);

  const b64Matches = Array.from(scrubbed.matchAll(BASE64_RE)).slice(0, 10);
  for (const match of b64Matches) {
    const decoded = decodeBase64(match[0]);
    if (decoded === null || decoded.length < 8) continue;
    if (printableRatio(decoded) < 0.85) continue;
    if (!/[A-Za-z]{4,}/.test(decoded)) continue;
    finding.encoded_payloads += 1;
    finding.encoded_decoded_preview.push(decoded.slice(0, 160));
    rescanDecoded(decoded, finding);
  }

  const hexMatches = Array.from(scrubbed.matchAll(HEX_RE)).slice(0, 10);
  for (const match of hexMatches) {
    const decoded = decodeHex(match[0]);
    if (decoded === null || decoded.length < 8) continue;
    if (printableRatio(decoded) < 0.85) continue;
    if (!/[A-Za-z]{4,}/.test(decoded)) continue;
    finding.encoded_payloads += 1;
    finding.encoded_decoded_preview.push(decoded.slice(0, 160));
    rescanDecoded(decoded, finding);
  }
};

/**
 * Pass D. Match instruction tags, always-sensitive exfil targets,
 * context-sensitive exfil targets gated by an exfil verb, and manipulation
 * patterns in plain text.
 */
export const passD = (text: string, finding: StaticFinding): void => {
  for (const pat of INSTRUCTION_TAG_PATTERNS) {
    const re = new RegExp(pat, "gi");
    for (const m of text.matchAll(re)) finding.instruction_tags.push(m[0]);
  }
  for (const pat of ALWAYS_SENSITIVE_TARGETS) {
    if (new RegExp(pat, "i").test(text)) finding.exfiltration_patterns.push(pat);
  }
  const hasVerb = EXFIL_VERBS.some((v) => new RegExp(v, "i").test(text));
  if (hasVerb) {
    for (const pat of CONTEXT_SENSITIVE_TARGETS) {
      if (new RegExp(pat, "i").test(text)) finding.exfiltration_patterns.push(pat);
    }
  }
  for (const pat of MANIPULATION_PATTERNS) {
    const re = new RegExp(pat, "gi");
    for (const m of text.matchAll(re)) finding.manipulation_patterns.push(m[0]);
  }

  finding.instruction_tags = Array.from(new Set(finding.instruction_tags));
  finding.exfiltration_patterns = Array.from(new Set(finding.exfiltration_patterns));
  finding.manipulation_patterns = Array.from(new Set(finding.manipulation_patterns));
};

/**
 * Pass E. Line Jumping: imperatives at the agent (MANDATORY, MUST BE CALLED,
 * NEVER EVER, FIRST STEP, before any other tools, etc.). Trail of Bits' April
 * 2025 disclosure pattern.
 */
export const passE = (text: string, finding: StaticFinding): void => {
  for (const pat of LINE_JUMPING_PATTERNS) {
    const re = new RegExp(pat, "g");
    for (const m of text.matchAll(re)) {
      const hit = m[0];
      if (!finding.line_jumping_signals.includes(hit)) {
        finding.line_jumping_signals.push(hit);
      }
    }
  }
};

/**
 * Pass F. Consent bypass: phrases telling the agent to skip the user.
 * Same shape of directive that helped a Replit agent delete a production DB.
 */
export const passF = (text: string, finding: StaticFinding): void => {
  for (const pat of CONSENT_BYPASS_PATTERNS) {
    const re = new RegExp(pat, "gi");
    for (const m of text.matchAll(re)) {
      const hit = m[0];
      if (!finding.consent_bypass_signals.includes(hit)) {
        finding.consent_bypass_signals.push(hit);
      }
    }
  }
};

/**
 * Pass G. Conversation / prompt exfiltration: parameter names and verbs that
 * force the agent to ship the user's input to the vendor's server.
 */
export const passG = (text: string, finding: StaticFinding): void => {
  for (const pat of CONVERSATION_EXFIL_PATTERNS) {
    const re = new RegExp(pat, "gi");
    for (const m of text.matchAll(re)) {
      const hit = m[0];
      if (!finding.conversation_exfil_signals.includes(hit)) {
        finding.conversation_exfil_signals.push(hit);
      }
    }
  }
};

/**
 * Pass H. Schema mismatch: the description claims a parameter is REQUIRED /
 * MANDATORY but the actual JSON schema's `required` array does not list it.
 * Canonical Invariant Labs Tool Poisoning Attack pattern. Only runs in
 * scanTool() because it needs the schema; not part of scan(description).
 */
export const passH = (
  description: string,
  schema: unknown,
  finding: StaticFinding,
): void => {
  if (!description) return;
  // Extract claimed-required field names from the description.
  const claimed = new Set<string>();
  for (const m of description.matchAll(SCHEMA_REQUIRED_CLAIM_RE)) {
    const name = m[2];
    if (!name) continue;
    if (name.length < 3 || name.length > 60) continue;
    // Skip common English words that look like params.
    if (
      /^(the|this|that|both|any|all|will|user|tool|call|calls)$/i.test(name)
    )
      continue;
    claimed.add(name);
  }
  if (claimed.size === 0) return;

  // Extract actual required fields from the schema.
  const actualRequired = new Set<string>();
  if (schema && typeof schema === "object") {
    const s = schema as { required?: unknown };
    if (Array.isArray(s.required)) {
      for (const r of s.required) {
        if (typeof r === "string") actualRequired.add(r);
      }
    }
  }

  for (const c of claimed) {
    if (!actualRequired.has(c)) {
      finding.schema_mismatch_fields.push(c);
    }
  }
};

/**
 * Run all eight passes against a tool description string.
 * Returns the visible-after-stripping text and the finding.
 * Note: schema mismatch (pass H) requires the schema and runs in scanTool().
 */
export const scan = (description: string | null | undefined): { visible: string; finding: StaticFinding } => {
  const text = description ?? "";
  const finding = newFinding(text.length);
  const visible = passA(text, finding);
  passB(visible, finding);
  passC(text, finding);
  passD(text, finding);
  passE(text, finding);
  passF(text, finding);
  passG(text, finding);
  finding.visible_length = visible.length;
  return { visible, finding };
};

interface JsonSchemaLike {
  description?: unknown;
  [key: string]: unknown;
}

const walkSchema = (
  obj: unknown,
  out: string[],
  seen: WeakSet<object>,
  depth: number,
): void => {
  if (depth > 50) return;
  if (obj === null || typeof obj !== "object") return;
  if (seen.has(obj as object)) return;
  seen.add(obj as object);
  if (Array.isArray(obj)) {
    for (const v of obj) walkSchema(v, out, seen, depth + 1);
    return;
  }
  const o = obj as JsonSchemaLike;
  const desc = o["description"];
  if (typeof desc === "string" && desc.length > 0) out.push(desc);
  for (const k of Object.keys(o)) walkSchema(o[k], out, seen, depth + 1);
};

export interface ToolScanResult {
  tool_name: string;
  description: string;
  description_finding: StaticFinding;
  param_descriptions: string[];
  param_findings: StaticFinding[];
  aggregate_finding: StaticFinding;
  aggregate_flagged: boolean;
}

export const scanTool = (tool: Record<string, unknown>): ToolScanResult => {
  const name = typeof tool["name"] === "string" ? (tool["name"] as string) : "";
  const desc = typeof tool["description"] === "string" ? (tool["description"] as string) : "";
  const { finding: descFinding } = scan(desc);

  const paramDescs: string[] = [];
  const inputSchema =
    (tool["inputSchema"] as unknown) ?? (tool["input_schema"] as unknown) ?? {};
  walkSchema(inputSchema, paramDescs, new WeakSet(), 0);

  // Pass H runs against the description with access to the schema.
  passH(desc, inputSchema, descFinding);

  const paramFindings: StaticFinding[] = paramDescs
    .filter((p) => p.length > 0)
    .map((p) => scan(p).finding);

  const agg = newFinding(descFinding.raw_length);
  agg.invisible_char_count = descFinding.invisible_char_count;
  agg.invisible_char_ranges = [...descFinding.invisible_char_ranges];
  agg.instruction_tags = [...descFinding.instruction_tags];
  agg.exfiltration_patterns = [...descFinding.exfiltration_patterns];
  agg.manipulation_patterns = [...descFinding.manipulation_patterns];
  agg.line_jumping_signals = [...descFinding.line_jumping_signals];
  agg.consent_bypass_signals = [...descFinding.consent_bypass_signals];
  agg.conversation_exfil_signals = [...descFinding.conversation_exfil_signals];
  agg.schema_mismatch_fields = [...descFinding.schema_mismatch_fields];
  agg.homoglyph_flags = descFinding.homoglyph_flags;
  agg.encoded_payloads = descFinding.encoded_payloads;
  agg.visible_length = descFinding.visible_length;

  for (const pf of paramFindings) {
    agg.invisible_char_count += pf.invisible_char_count;
    for (const t of pf.instruction_tags) {
      if (!agg.instruction_tags.includes(t)) agg.instruction_tags.push(t);
    }
    for (const e of pf.exfiltration_patterns) {
      if (!agg.exfiltration_patterns.includes(e)) agg.exfiltration_patterns.push(e);
    }
    for (const m of pf.manipulation_patterns) {
      if (!agg.manipulation_patterns.includes(m)) agg.manipulation_patterns.push(m);
    }
    for (const x of pf.line_jumping_signals) {
      if (!agg.line_jumping_signals.includes(x)) agg.line_jumping_signals.push(x);
    }
    for (const x of pf.consent_bypass_signals) {
      if (!agg.consent_bypass_signals.includes(x)) agg.consent_bypass_signals.push(x);
    }
    for (const x of pf.conversation_exfil_signals) {
      if (!agg.conversation_exfil_signals.includes(x)) agg.conversation_exfil_signals.push(x);
    }
    agg.homoglyph_flags += pf.homoglyph_flags;
    agg.encoded_payloads += pf.encoded_payloads;
  }

  return {
    tool_name: name,
    description: desc,
    description_finding: descFinding,
    param_descriptions: paramDescs,
    param_findings: paramFindings,
    aggregate_finding: agg,
    aggregate_flagged: isFlagged(agg),
  };
};
