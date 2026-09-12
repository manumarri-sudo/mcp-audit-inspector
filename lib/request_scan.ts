import type { DiffResponse, ScanResponse } from "../app/components/InspectorSupport";

export async function requestScan(text: string, fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<{ diff: DiffResponse; scan: ScanResponse }> {
  async function post(url: string, body: Record<string, string>) {
    const response = await fetcher(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), ...(signal ? { signal } : {}) });
    if (!response.ok) throw new Error("Scan failed or input is unsupported. Paste tool descriptions, not a connection config; no clean result is available.");
    return response.json();
  }
  const [diff, scan] = await Promise.all([post("/api/diff", { text }), post("/api/scan", { config: text })]);
  if (!Array.isArray(diff?.hidden) || typeof diff.visible !== "string" ||
      !Number.isFinite(scan?.summary?.score) || !Array.isArray(scan?.servers) || !scan.servers.length) {
    throw new Error("The scanner returned an incomplete response; no score is available.");
  }
  return { diff, scan };
}
