"use client";
import { useEffect, useState } from "react";
import type { DiffResponse, ScanResponse } from "./InspectorSupport";
import { requestScan } from "../../lib/request_scan";

type Result = { input: string; diff: DiffResponse; scan: ScanResponse };
export function useInspector(input: string) {
  const [result, setResult] = useState<Result | null>(null);
  const [failure, setFailure] = useState<{ input: string; message: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!input.trim()) return;
      setFailure(null);
      try {
        const response = await requestScan(input, fetch, controller.signal);
        if (!controller.signal.aborted) setResult({ input, ...response });
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult(null);
          setFailure({ input, message: error instanceof Error ? error.message : "Scan failed. No result is available." });
        }
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [input]);
  const current = result?.input === input ? result : null;
  const error = failure?.input === input ? failure.message : null;
  return { diff: current?.diff ?? null, scan: current?.scan ?? null, error,
    loading: !!input.trim() && !current && !error };
}
