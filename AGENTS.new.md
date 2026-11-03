# API Monitor (DevFlow OS) — Project Notes

A multi-tenant API monitoring platform: uptime checks, logs, incidents, error tracking, workflow automation, and (next) an AI incident analyst.

## Working Rules

- Do one milestone at a time; finish it before starting the next.
- Prefer learning and explanation before automatic coding.
- Test each API (Postman or automated tests) before moving ahead.
- Keep backend stable before building frontend on top of it.
- Update this file after each milestone.

## Stack

- Backend (`backend/`): Express 5, TypeScript, MongoDB (Mongoose), BullMQ + Redis (ioredis, TLS for Upstash), JWT auth, Helmet, express-rate-limit, Winston, Nodemailer, Gemini (`@google/generative-ai`).
- Frontend (`frontend/`): React + Vite + TypeScript, React Router, Auth/Workspace contexts, small UI kit in `components/ui`.
- Deployment: backend on Render, Redis on Upstash.

## Architecture (short)

1. A BullMQ job per monitor runs the check (HTTP/TCP/PING/DNS) with retries, plus an SSL check.
2. The worker updates monitor status and writes a `Log` entry.
3. Incident lifecycle opens/resolves incidents on status changes.
4. Event service emits UP/DOWN/SLOW events; matching workflows run actions (Email, Webhook, Slack, Teams) and store a `WorkflowExecution`.
5. All data is scoped by `workspaceId`; RBAC roles: Owner, Admin, Member, Viewer.
6. Exceptions are ingested at `/api/errors` and grouped into issues (mini-Sentry).

Routes: `/api/auth`, `/api/workspaces`, `/api/monitors`, `/api/workflows`, `/api/incidents`, `/api/errors`, `/healthz`.

## Done

- Auth: register/login, JWT + bearer, profile, token verification
- Workspaces, invitations, RBAC
- Monitoring engine: HTTP/TCP/PING/DNS, retries, SSL expiry tracking, assertions (status code, response time, text body, JSONPath)
- Logs and analytics (uptime %, avg response time, failure count)
- Distributed check execution via BullMQ + Redis
- Event system and workflow engine; email/webhook/Slack/Teams actions; manual workflow test endpoint
- Incident management (open/ack/resolve, assignees, timeline)
- Error tracking: ingestion, issue grouping, search/filters
- Frontend dashboard: monitors, workflows, team, incidents, issues
- Production fixes: CORS preflight, rate-limiter bypass, `rediss://` TLS support

## Next (committed, in order)

1. **Quality and hygiene**
   - [ ] (deferred, revisit before finishing) Automated tests: assertion engine, retry logic, incident lifecycle, RBAC middleware, key API integration tests
   - [ ] (deferred, needs tests) CI (GitHub Actions: build + tests)
   - [ ] (deferred) Restrict CORS to an origin allowlist (currently reflects any origin)
   - [x] Remove `node_modules` from git tracking; verify `.gitignore` (staged, not yet committed)
   - [x] Env var documentation (`.env.example` in backend and frontend)
   - [ ] ~~Split worker into its own entry point~~ — deferred, see Vision
2. **Live dashboard (Phase 6)**
   - [ ] Uptime % and response-time charts
   - [ ] Socket.io live status updates
3. **AI incident analyst (showpiece)**
   - [ ] Agent triggered on incident open, run as a BullMQ job
   - [ ] Tools (all scoped by `workspaceId` from the authenticated context, never from model output):
     `get_recent_logs`, `get_ssl_info`, `get_related_exceptions`, `get_other_monitor_statuses`, `dns_lookup`
   - [ ] Structured output: probable cause, cited evidence, confidence, next steps
   - [ ] Store tool calls + evidence with the analysis; show in incident timeline
   - [ ] Safety: treat logs/errors as untrusted data (prompt-injection aware), per-workspace rate/cost limits, caching
   - [ ] Graceful failure: incident flow never blocks on AI
   - [ ] Small eval: 10–15 simulated incidents (expired SSL, DNS failure, slow DB, etc.)
   - [ ] Natural-language workflow creation, validated against the workflow schema (`actionValidation.ts`) before saving
4. **Portfolio polish**
   - [ ] README: architecture diagram, screenshots/GIF, live demo link, design decisions and trade-offs
   - [ ] Simple load test (k6/autocannon) with a stated result and bottleneck

After item 4: stop adding features and prepare for interviews.

## Cheap extras (pick if time allows)

- Inbound heartbeat / push monitoring webhooks
- Google login or OTP login; logout from all devices
- Storage-full / DB-space alerts
- Accessibility pass (keyboard nav, ARIA labels) and theme polish

## Vision (not committed)

Deferred (not needed at current scale): split the BullMQ worker out of the API process into its own entry point (`src/worker.ts`, `dev:worker`/`start:worker` scripts), optionally behind a `RUN_WORKER` env flag so one Render service can still run both. Today `server.ts` starts the worker in-process; the two only communicate via the Redis queue, so the split is straightforward when monitor volume grows.

Ideas deliberately out of scope for now: visual workflow builder (React Flow), worker registration/heartbeats/autoscaling, synthetic and browser (Playwright) monitoring, public status pages, secret manager, plugin SDK, enterprise features (SSO/SAML, audit logs), Grafana/CloudWatch exporters, Kubernetes configs.

## Interview prep (answer fluently)

- Why a queue? How do you avoid duplicate checks across workers?
- How would you scale to 100k monitors? What breaks first?
- What happens if Redis or Mongo goes down?
- How is tenant isolation enforced, including in AI tools?
- How do you handle prompt injection from log content?
