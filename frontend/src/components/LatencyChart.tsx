import { MonitorLog } from "../types";

type Props = {
  /** Checks in time order, oldest first. */
  logs: MonitorLog[];
};

// Drawing area (SVG units; the SVG scales to its container width)
const W = 600;
const H = 170;
const PAD = { left: 48, right: 16, top: 14, bottom: 28 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

/** Round up to a "nice" axis maximum: 1, 2 or 5 × 10^n (e.g. 1730 → 2000). */
const niceMax = (value: number) => {
  const v = Math.max(value, 100);
  const power = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 5, 10].find((m) => m * power >= v)!;
  return step * power;
};

const formatMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s` : `${ms}ms`);
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * Response time of the latest checks: one scale for the line, the area and the points,
 * three y-axis ticks, and only first / middle / last time labels so they never collide.
 * DOWN checks are drawn in red. Hover a point for its exact value.
 */
export function LatencyChart({ logs }: Props) {
  const n = logs.length;
  const top = niceMax(Math.max(...logs.map((l) => l.responseTime)));
  const x = (i: number) => PAD.left + (n === 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W);
  const y = (ms: number) => PAD.top + PLOT_H - (Math.min(ms, top) / top) * PLOT_H;

  const points = logs.map((l, i) => ({ x: x(i), y: y(l.responseTime), log: l }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L ${points[n - 1].x.toFixed(1)} ${PAD.top + PLOT_H} L ${points[0].x.toFixed(1)} ${PAD.top + PLOT_H} Z`;

  const ticks = [0, top / 2, top];
  const labelIndexes = Array.from(new Set([0, Math.floor((n - 1) / 2), n - 1]));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto text-slate-400 dark:text-slate-500"
      role="img"
      aria-label={`Response time of the last ${n} checks, latest ${formatMs(logs[n - 1].responseTime)}`}
    >
      <defs>
        <linearGradient id="latency-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* y-axis grid and labels */}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity="0.18" />
          <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="currentColor">
            {formatMs(Math.round(t))}
          </text>
        </g>
      ))}

      <path d={area} fill="url(#latency-area)" />
      <path d={line} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p) => (
        <circle
          key={p.log._id}
          cx={p.x}
          cy={p.y}
          r="4"
          fill={p.log.status === "DOWN" ? "#ef4444" : "#3b82f6"}
          stroke="#0f172a"
          strokeOpacity="0.15"
        >
          <title>{`${formatMs(p.log.responseTime)} · ${p.log.status} · ${new Date(p.log.checkedAt).toLocaleString()}`}</title>
        </circle>
      ))}

      {/* x-axis: first, middle and last check times only */}
      {labelIndexes.map((i, k) => (
        <text
          key={i}
          x={x(i)}
          y={H - 8}
          fontSize="11"
          fill="currentColor"
          textAnchor={labelIndexes.length > 1 && k === 0 ? "start" : k === labelIndexes.length - 1 && labelIndexes.length > 1 ? "end" : "middle"}
        >
          {formatTime(logs[i].checkedAt)}
        </text>
      ))}
    </svg>
  );
}
