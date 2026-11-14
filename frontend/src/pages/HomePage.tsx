import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Bug,
  ExternalLink,
  GitBranch,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const GITHUB_URL = "https://github.com/tanmaysde/monitor-api";

const FEATURES = [
  {
    icon: Activity,
    title: "Monitoring",
    text: "HTTP, TCP, DNS and ping checks on a schedule, with retries before anything is marked down, assertions on status code, body or JSON path, and SSL expiry tracking.",
  },
  {
    icon: AlertTriangle,
    title: "Incidents",
    text: "An incident opens the moment a monitor goes down and resolves when it recovers. Acknowledge, assign and comment, with a full timeline.",
  },
  {
    icon: GitBranch,
    title: "Alert workflows",
    text: "Send email, Slack, Microsoft Teams or webhook alerts when a service goes down, recovers or slows. Scope each workflow to the monitors you choose.",
  },
  {
    icon: Sparkles,
    title: "AI root-cause analysis",
    text: "An agent reads the logs, SSL status, related errors and DNS for the outage, checks its own evidence, and suggests a probable cause and next steps.",
  },
  {
    icon: Bug,
    title: "Error tracking",
    text: "One script tag captures uncaught browser errors and groups duplicates, with counts by browser, OS and page.",
  },
  {
    icon: Users,
    title: "Teams and roles",
    text: "Workspaces with Owner, Admin, Member and Viewer roles. Every record belongs to one workspace and is never visible outside it.",
  },
];

const STEPS = [
  { icon: Timer, title: "Check", text: "A job queue checks each monitor on its interval." },
  { icon: AlertTriangle, title: "Detect", text: "A change to DOWN opens one incident." },
  { icon: Bell, title: "Alert", text: "Matching workflows notify your team." },
  { icon: Sparkles, title: "Explain", text: "The AI agent investigates in the background." },
  { icon: ShieldCheck, title: "Resolve", text: "Recovery closes the incident automatically." },
];

const STACK = ["Node.js", "Express", "TypeScript", "MongoDB", "Redis + BullMQ", "LangGraph", "Gemini", "React", "Tailwind CSS"];

function Screenshot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-1.5 shadow-2xl shadow-black/40">
      <div className="flex gap-1.5 px-2 py-1.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
      </div>
      <img src={src} alt={alt} loading="lazy" className="w-full rounded-lg" />
    </div>
  );
}

export function HomePage() {
  const { token, completeAuth } = useAuth();
  const navigate = useNavigate();
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState("");

  useEffect(() => {
    api
      .getFeatures()
      .then((f) => setDemoEnabled(Boolean(f.demo)))
      .catch(() => setDemoEnabled(false));
  }, []);

  async function startDemo() {
    try {
      setDemoBusy(true);
      setDemoError("");
      const response = await api.demoLogin();
      completeAuth(response);
      navigate("/dashboard");
    } catch (err: any) {
      setDemoError(err?.message || "The live demo is not available right now.");
    } finally {
      setDemoBusy(false);
    }
  }

  const primaryCta = token ? (
    <Link
      to="/dashboard"
      className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
    >
      Open the console <ArrowRight className="h-4 w-4" />
    </Link>
  ) : demoEnabled ? (
    <button
      type="button"
      onClick={startDemo}
      disabled={demoBusy}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
    >
      {demoBusy ? "Opening the demo…" : "Try the live demo"} <ArrowRight className="h-4 w-4" />
    </button>
  ) : (
    <Link
      to="/login"
      className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
    >
      Get started <ArrowRight className="h-4 w-4" />
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navigation */}
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
              <Activity className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold tracking-tight">Control Room</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-5 text-sm">
            <a href="#features" className="hidden sm:inline text-slate-400 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hidden sm:inline text-slate-400 hover:text-white transition-colors">How it works</a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hidden sm:inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
              GitHub <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {token ? (
              <Link to="/dashboard" className="rounded-lg border border-slate-700 px-3 py-1.5 font-medium hover:bg-slate-800 transition-colors">
                Open console
              </Link>
            ) : (
              <Link to="/login" className="rounded-lg border border-slate-700 px-3 py-1.5 font-medium hover:bg-slate-800 transition-colors">
                Log in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[880px] -translate-x-1/2 rounded-full bg-brand-500/15 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">API monitoring · incidents · AI diagnosis</p>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl" style={{ textWrap: "balance" } as any}>
                Know when your APIs break, and why.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400">
                Control Room checks your endpoints on a schedule, opens an incident the moment one goes down,
                alerts your team on email, Slack, Teams or webhooks, and has an AI agent investigate the cause.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {primaryCta}
                {!token && (
                  <Link to="/login" className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-colors">
                    Create an account
                  </Link>
                )}
              </div>
              {!token && demoEnabled && (
                <p className="mt-3 text-xs text-slate-500">The demo is read-only and needs no sign-up.</p>
              )}
              {demoError && (
                <p role="alert" className="mx-auto mt-4 max-w-md rounded-lg border border-danger-900/50 bg-danger-950/40 px-4 py-2 text-sm text-danger-300">
                  {demoError}
                </p>
              )}
            </div>
            <div className="mx-auto mt-14 max-w-5xl">
              <Screenshot src="/screenshots/dashboard.png" alt="Overview dashboard with monitor status cards and the endpoint list" />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t border-slate-800/80 bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Everything between "it's down" and "it's fixed"</h2>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Showcase */}
        <section className="mx-auto max-w-6xl space-y-24 px-4 py-20 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold tracking-tight">Every check, on one page</h2>
              <p className="mt-3 leading-relaxed text-slate-400">
                Each monitor shows its uptime ratio, the last 30 checks as a status strip, a latency chart,
                its SSL certificate and the full check history, including the error behind every failure.
              </p>
            </div>
            <div className="lg:col-span-3">
              <Screenshot src="/screenshots/monitor.png" alt="Monitor detail page with uptime history, latency chart and check log" />
            </div>
          </div>
          <div className="grid items-center gap-10 lg:grid-cols-5">
            <div className="lg:col-span-3 lg:order-1 order-2">
              <Screenshot src="/screenshots/incident-ai.png" alt="Incident page with the AI root-cause analysis panel" />
            </div>
            <div className="lg:col-span-2 lg:order-2 order-1">
              <h2 className="text-2xl font-bold tracking-tight">An AI agent investigates each outage</h2>
              <p className="mt-3 leading-relaxed text-slate-400">
                The agent decides which data to read, a critic step checks whether the evidence is enough,
                and the result lists the probable cause, the facts it is based on and what to do next.
                Its tools are read-only and limited to your workspace.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 border-t border-slate-800/80 bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
            <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-center gap-2 text-brand-400">
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-14 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Built with</p>
              <ul className="mt-4 flex flex-wrap justify-center gap-2">
                {STACK.map((tech) => (
                  <li key={tech} className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                    {tech}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">See it with real data</h2>
          <p className="mt-3 text-slate-400">
            {demoEnabled && !token
              ? "Open the demo workspace: monitors, incidents, an AI analysis and tracked errors are already there."
              : "Create a workspace and add your first monitor in under a minute."}
          </p>
          <div className="mt-8 flex justify-center">{primaryCta}</div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:px-6">
          <span>Control Room · a portfolio project</span>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-slate-300">
            Source on GitHub <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </footer>
    </div>
  );
}
