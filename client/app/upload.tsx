"use client";
import { useRef, useState } from "react";
import { call, formatGenerationError, friendlyError } from "./api";
import { parseCases, type BatchCase } from "./cases";

type Row = { c: BatchCase; status: "queued" | "running" | "done" | "failed"; message: string; kitId?: string };
type Props = { provider: string; model: string; defaultDays: number; onOpen: (kitId: string) => void };

const POLL_MS = 650, MAX_POLLS = 600;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runCase(c: BatchCase, provider: string, model: string, progress: (label: string) => void): Promise<string> {
  const r = await call("/api/generation/jobs", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jd: c.jd, company_url: c.company_url, days: c.days, llm_provider: provider, llm_model: model }),
  });
  const started = await r.json();
  if (!r.ok) throw new Error(started.error?.message || "Could not start generation");
  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_MS);
    const job = await (await call("/api/generation/jobs/" + encodeURIComponent(started.id))).json();
    if (job.status === "complete") return job.result.id;
    if (job.status === "failed") throw new Error(formatGenerationError(job.error));
    progress(job.label || "Working…");
  }
  throw new Error("Timed out waiting for the kit.");
}

export default function BatchUpload({ provider, model, defaultDays, onOpen }: Props) {
  const [rows, setRows] = useState<Row[]>([]), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const update = (i: number, patch: Partial<Row>) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    let cases: BatchCase[];
    try { cases = parseCases(await file.text(), defaultDays); } catch (e) { setRows([]); setError(friendlyError(e,"Could not read the file.")); return; }
    if (!cases.length) { setRows([]); setError("The file has no cases."); return; }
    setRows(cases.map((c) => ({ c, status: c.error ? "failed" : "queued", message: c.error || "Waiting" })));
    setBusy(true);
    for (let i = 0; i < cases.length; i++) {
      if (cases[i].error) continue;
      update(i, { status: "running", message: "Starting…" });
      try {
        const kitId = await runCase(cases[i], provider, model, (label) => update(i, { message: label }));
        update(i, { status: "done", message: "Kit ready", kitId });
      } catch (e) { update(i, { status: "failed", message: friendlyError(e,"Generation failed") }); }
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return <section className="existing-kit batch-upload" aria-labelledby="batch-title">
    <div><p className="eyebrow">Preparing several roles?</p><h2 id="batch-title">Upload a file of roles.</h2>
      <p>JSON array or CSV with <code>jd</code>, <code>company_url</code> and optional <code>days</code>. Each role becomes its own kit.</p></div>
    <div className="load-kit">
      <label className="secondary-button file-button">{busy ? "Generating…" : "Choose file"}
        <input ref={input} aria-label="Upload a JSON or CSV file of roles" type="file" accept=".json,.csv,application/json,text/csv" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} className="visually-hidden" />
      </label>
    </div>
    {error && <div role="alert" className="alert batch-full"><strong>Could not use that file.</strong><span>{error}</span></div>}
    {rows.length > 0 && <ol className="batch-list batch-full" aria-live="polite">{rows.map((r, i) =>
      <li key={i} className={"batch-row " + r.status}><span className="badge">Role {r.c.line}</span>
        <span className="batch-message">{r.c.company_url || "No URL"} — {r.message}</span>
        {r.kitId && <button className="secondary-button" onClick={() => onOpen(r.kitId!)}>Open kit →</button>}</li>)}</ol>}
  </section>;
}
