import { Sparkles, Loader2, AlertTriangle, ListChecks, Search } from "lucide-react";
import { Button } from "./ui/Button";
import { IncidentAnalysis } from "../types";

type Props = {
  analysis?: IncidentAnalysis;
  canAnalyze: boolean;
  busy: boolean;
  onAnalyze: () => void;
};

const confidenceClass: Record<string, string> = {
  HIGH: "bg-healthy-50 text-healthy-750 border-healthy-200 dark:bg-healthy-950/10 dark:text-healthy-400 dark:border-healthy-900/20",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
  LOW: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

export function AiAnalysisPanel({ analysis, canAnalyze, busy, onAnalyze }: Props) {
  const status = analysis?.status;
  const isPending = status === "PENDING";

  return (
    <section
      aria-label="AI root-cause analysis"
      className="border border-brand-200/60 dark:border-brand-500/20 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> AI Root-Cause Analysis
        </h3>
        {canAnalyze && (
          <Button variant="primary" size="sm" onClick={onAnalyze} disabled={busy || isPending}>
            {isPending ? "Analyzing…" : analysis ? "Re-run analysis" : "Analyze with AI"}
          </Button>
        )}
      </div>

      {!analysis && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No analysis yet. The AI agent can inspect recent checks, SSL status, related exceptions, other monitors and DNS to
          suggest a probable cause.
        </p>
      )}

      {isPending && (
        <div role="status" className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Investigating… the agent is gathering evidence. This usually takes under a minute.
        </div>
      )}

      {status === "FAILED" && (
        <div className="flex items-start gap-2 p-3 text-xs text-danger-700 bg-danger-50 dark:bg-danger-950/20 dark:text-danger-400 rounded-md">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{analysis?.error || "The analysis failed."}</span>
        </div>
      )}

      {status === "DONE" && analysis && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Probable cause</span>
              {analysis.confidence && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${confidenceClass[analysis.confidence]}`}
                >
                  {analysis.confidence} confidence
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{analysis.probableCause}</p>
          </div>

          {!!analysis.evidence?.length && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Search className="w-3 h-3" /> Evidence
              </span>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-650 dark:text-slate-350">
                {analysis.evidence.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {!!analysis.nextSteps?.length && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ListChecks className="w-3 h-3" /> Suggested next steps
              </span>
              <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-650 dark:text-slate-350">
                {analysis.nextSteps.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            </div>
          )}

          {!!analysis.toolCalls?.length && (
            <details className="text-xs text-slate-500 dark:text-slate-400">
              <summary className="cursor-pointer font-semibold select-none">
                Data the agent examined ({analysis.toolCalls.length})
              </summary>
              <ul className="mt-2 space-y-1 pl-1">
                {analysis.toolCalls.map((call, i) => (
                  <li key={i} className="font-mono text-[11px]">
                    <span className="text-brand-600 dark:text-brand-400">{call.name}</span> → {call.summary}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <p className="text-[10px] text-slate-400">
            AI-generated{analysis.model ? ` by ${analysis.model}` : ""}
            {analysis.completedAt ? ` · ${new Date(analysis.completedAt).toLocaleString()}` : ""}. Verify before acting.
          </p>
        </div>
      )}
    </section>
  );
}
