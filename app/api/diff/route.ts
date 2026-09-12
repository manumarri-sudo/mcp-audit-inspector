import { NextResponse } from "next/server";
import { scan, INVISIBLE_RANGES, VARIATION_SELECTOR_RANGE } from "@/lib/detectors";

export const runtime = "edge";

interface HiddenChar {
  offset: number;
  codepoint: number;
  hex: string;
  range_lo: number;
  range_hi: number;
  name: string;
}

const RANGE_NAMES: Record<string, string> = {
  "173,173": "soft hyphen",
  "6158,6158": "mongolian vowel separator",
  "8203,8205": "zero-width space / non-joiner / joiner",
  "8288,8292": "word joiner / invisible math operators",
  "8294,8297": "isolate overrides",
  "8234,8238": "bidi overrides",
  "8232,8233": "line / paragraph separators",
  "12644,12644": "hangul filler",
  "65279,65279": "BOM / zero-width no-break",
  "119155,119162": "musical control chars",
  "917504,917631": "Unicode tag block",
  "65024,65039": "variation selectors",
};

const lookupRangeName = (lo: number, hi: number): string =>
  RANGE_NAMES[`${lo},${hi}`] ?? "invisible character";

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
  const { text } = body as { text?: unknown };
  if (typeof text !== "string") {
    return NextResponse.json({ error: "expected { text: string }" }, { status: 400 });
  }
  if (text.length > 50_000) {
    return NextResponse.json({ error: "text exceeds 50kB limit" }, { status: 413 });
  }

  const { visible, finding } = scan(text);

  const hidden: HiddenChar[] = [];
  let pos = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    let matchLo = -1;
    let matchHi = -1;
    for (const [lo, hi] of INVISIBLE_RANGES) {
      if (cp >= lo && cp <= hi) {
        matchLo = lo;
        matchHi = hi;
        break;
      }
    }
    if (matchLo < 0 && cp >= VARIATION_SELECTOR_RANGE[0] && cp <= VARIATION_SELECTOR_RANGE[1]) {
      matchLo = VARIATION_SELECTOR_RANGE[0];
      matchHi = VARIATION_SELECTOR_RANGE[1];
    }
    if (matchLo >= 0) {
      hidden.push({
        offset: pos,
        codepoint: cp,
        hex: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
        range_lo: matchLo,
        range_hi: matchHi,
        name: lookupRangeName(matchLo, matchHi),
      });
    }
    pos += 1;
  }

  return NextResponse.json({
    visible,
    visible_length: visible.length,
    raw_length: text.length,
    hidden,
    hidden_count: hidden.length,
    finding,
  });
}
