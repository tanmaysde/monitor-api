import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Activity, ShieldCheck, Zap, BarChart3 } from "lucide-react";

export function AuthPage() {
  const { authBusy, authError, authMode, login, register, setAuthMode } =
    useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (authMode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
      navigate("/dashboard", { replace: true });
    } catch (e) {
      // Errors are caught and handled by AuthContext
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-slate-950 transition-colors duration-200">
      
      {/* Left side panel - SaaS branding */}
      <section className="hidden lg:flex lg:col-span-7 xl:col-span-8 bg-slate-900 dark:bg-slate-950 border-r border-slate-800 relative overflow-hidden flex-col justify-between p-12 text-white">
        
        {/* Subtle decorative circles */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-healthy-500/5 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />

        {/* Branding header */}
        <div className="flex items-center gap-2.5 z-10">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-500 text-white shadow-lg shadow-brand-500/20">
            <Activity className="w-5 h-5 animate-pulse-indicator" />
          </div>
          <span className="font-bold tracking-tight text-lg">Control Room</span>
        </div>

        {/* Feature Copy */}
        <div className="max-w-xl my-auto z-10 space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight xl:text-5xl">
            Monitor endpoints, route incidents, and build trigger actions.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            A premium operations platform designed for developers. Create checkers, analyze status history graphs, inspect webhook events, and configure multi-channel automation workflows.
          </p>

          {/* Quick value props list */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-850">
            <div className="flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold">Checker Engine</h4>
                <p className="text-[10px] text-slate-400">Under 1s checks</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <BarChart3 className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold">Analytics Logs</h4>
                <p className="text-[10px] text-slate-400">Response & uptime</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold">Automations</h4>
                <p className="text-[10px] text-slate-400">Action workflows</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-500 z-10">
          &copy; {new Date().getFullYear()} Control Room Inc. All rights reserved.
        </p>
      </section>

      {/* Right side panel - Forms */}
      <section className="col-span-1 lg:col-span-5 xl:col-span-4 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          
          {/* Header */}
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {authMode === "login" ? "Sign in to account" : "Create new account"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              {authMode === "login"
                ? "Enter your credentials to access the console"
                : "Enter details below to sign up for an account"}
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {authMode === "register" ? (
              <Input
                label="Full Name"
                value={form.name}
                onChange={(event) =>
                  setForm((state) => ({ ...state, name: event.target.value }))
                }
                placeholder="Tanmay"
                required
                disabled={authBusy}
              />
            ) : null}

            <Input
              type="email"
              label="Email Address"
              value={form.email}
              onChange={(event) =>
                setForm((state) => ({ ...state, email: event.target.value }))
              }
              placeholder="you@example.com"
              required
              disabled={authBusy}
            />

            <Input
              type="password"
              label="Password"
              value={form.password}
              onChange={(event) =>
                setForm((state) => ({
                  ...state,
                  password: event.target.value,
                }))
              }
              placeholder="••••••••"
              required
              disabled={authBusy}
            />

            {authError ? (
              <div className="p-3 text-xs font-semibold text-danger-700 bg-danger-50 dark:bg-danger-500/10 dark:text-danger-400 rounded-lg border border-danger-200/40">
                {authError}
              </div>
            ) : null}

            <Button
              className="w-full mt-2"
              type="submit"
              loading={authBusy}
            >
              {authMode === "login" ? "Sign In" : "Register"}
            </Button>
          </form>

          {/* Mode Switcher */}
          <div className="text-center pt-2">
            <button
              type="button"
              className="text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
              onClick={() =>
                setAuthMode(authMode === "login" ? "register" : "login")
              }
            >
              {authMode === "login"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>

        </div>
      </section>
    </div>
  );
}
