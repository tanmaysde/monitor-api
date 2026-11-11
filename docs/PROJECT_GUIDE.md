# DevFlow OS (API Monitor) — Complete Study Guide

> **Who this is for:** you, a fresher preparing to present this project in interviews.
> **What it covers:** what the project does, how every part works (backend + frontend), how data flows end to end, the honest weak spots, and a large bank of interview questions with model answers.
> **Accuracy note:** everything here was checked against the actual code in this repo. Where something is *not* working or is risky, it says so. Interviewers respect honesty far more than a perfect-sounding story that falls apart under one question.
>
> **Update after the security review:** the issues found in the first version of this guide (PING command injection, login not setting the refresh cookie, mass assignment on updates, Slack/Teams/webhook actions blocked, slow-alert spam, schedules not restored, hard-coded SSL card) have all been **fixed and tested**. Sections that used to list them as open now describe the fix. Know the *story* of each fix: it's a strong interview answer.

---

## Table of contents

0. [How to use this guide](#0-how-to-use-this-guide)
1. [The project in 60 seconds (your pitch) + 5-minute demo script](#1-the-project-in-60-seconds)
2. [Concepts primer (read this if any term is fuzzy)](#2-concepts-primer)
3. [Tech stack and why each piece was chosen](#3-tech-stack)
4. [Architecture and folder map](#4-architecture-and-folder-map)
5. [Data model (every collection)](#5-data-model)
6. [Feature walkthroughs (code level)](#6-feature-walkthroughs)
7. [End-to-end flows, step by step](#7-end-to-end-flows)
8. [API reference](#8-api-reference)
9. [Security review: what is good, what is risky](#9-security-review)
10. [Limitations and how you would improve them](#10-limitations-and-improvements)
11. [Glossary](#11-glossary)
12. [Interview questions and model answers](#12-interview-questions-and-model-answers)
13. [Cheat sheet and 7-day study plan](#13-cheat-sheet-and-study-plan)

---

## 0. How to use this guide

**Reading order (first pass, about 3 hours):** sections 1 → 4 → 6 → 7. Skip 2 if you already know JWT, queues and MongoDB basics.

**Second pass (about 3 hours):** open the real code next to sections 5, 6 and 7. For each feature, open the files named in the guide and follow the flow yourself. Reading code with a map in your hand is 5x faster than reading it cold.

**Third pass (about 2 hours):** read section 9 and 10 until you can *say the weak spots out loud before the interviewer finds them*. Then do section 12 out loud, without looking at the answers.

**Golden rules for the interview**
1. **Lead with the flow, not the tech list.** "When a monitor goes down, here's what happens…" beats "I used Node, Express, Mongo, Redis…".
2. **Know the trade-offs.** For every choice, have a one-line "why" and a one-line "what I'd change at larger scale".
3. **Own the gaps.** "I know X is a limitation, here's how I'd fix it" is a strong answer. "I didn't think about that" is a weak one.
4. **Say "I" carefully and truthfully.** If you used AI tools to help build parts of it, say so confidently and then show that you understand the result. Being able to explain and defend the code is what counts.

---

## 1. The project in 60 seconds

### Your pitch (memorize the shape, not the words)

> "DevFlow OS is a multi-tenant API monitoring platform. Teams create workspaces, add monitors for their HTTP, TCP, DNS or ping endpoints, and a background job queue checks them on a schedule. Every check is logged. When a service goes down, the system automatically opens an incident, fires events that trigger email alert workflows, and — if enabled — an AI agent investigates the outage by reading logs, SSL status, related exceptions and DNS, and proposes a probable cause with evidence. There's also a mini error-tracking module, similar to Sentry, that groups client-side exceptions. The backend is Node, Express, TypeScript and MongoDB with BullMQ and Redis for the workers; the frontend is React with Vite and Tailwind."

### The 4 ideas to remember
1. **Detect** — scheduled checks (queue + worker).
2. **React** — incidents, events, workflows (alerts).
3. **Explain** — logs, analytics, error tracking, AI diagnosis.
4. **Isolate** — every record belongs to a workspace; roles control who can do what.

### 5-minute demo script (rehearse this on the deployed site)

| Minute | What you do | What you say |
|---|---|---|
| 0:00 | Log in, show the Overview | "Each user belongs to workspaces. This dashboard summarizes monitor health for the active workspace." |
| 0:45 | Monitors page, open one monitor | "Each monitor has a type, interval, retries and optional assertions. I can see logs, analytics and events per monitor." |
| 1:45 | Show a DOWN monitor and trigger *Check now* | "A manual check runs the same pipeline the background worker uses." |
| 2:30 | Incidents page, open the incident | "When a monitor flips to DOWN the system opens one incident (no duplicates), with a timeline. I can acknowledge, assign, comment and resolve." |
| 3:30 | Click **Analyze with AI** (if enabled) | "An agent calls tools to gather evidence — logs, SSL, exceptions, other monitors, DNS — then returns a structured diagnosis. The model never touches the database directly; my code runs the tools and scopes them to this workspace." |
| 4:30 | Workflows page | "Events like API_DOWN trigger workflows that send alerts. I can test a workflow manually." |
| 5:00 | Stop. Offer to go deeper | "Happy to go into the queue design, auth, or the agent loop." |

**Before every demo:** run `npm run seed` (local) so there is data, flip `AI_ANALYSIS_ENABLED=true`, check that Redis is up (`/healthz` should say `UP`), and make sure your Gemini daily quota isn't used up.

---

## 2. Concepts primer

Short, plain-language explanations. If you can explain each in two sentences, you're ready.

### 2.1 HTTP, REST, and Express
- **HTTP request/response:** the browser sends a request (method + URL + headers + body), the server sends back a response (status code + body).
- **REST API:** URLs name *things* (`/api/monitors`), HTTP methods say *what to do* (GET read, POST create, PUT update, DELETE remove).
- **Express:** a Node library for building web servers. You register **routes** (`app.get("/x", handler)`) and **middleware** (functions that run before the handler).
- **Middleware:** a function `(req, res, next)`. It can inspect or modify the request, stop it (send a response), or pass it on by calling `next()`. In this project the chain for a protected route is: `cors → helmet → json parser → rate limiter → auth → checkWorkspaceRole → controller`.
- **Status codes you should know:** 200 OK, 201 Created, 202 Accepted (started, not finished), 400 bad input, 401 not logged in, 403 logged in but not allowed, 404 not found, 409 conflict, 429 too many requests, 500 server error, 503 service unavailable.

### 2.2 Authentication with JWT
- **JWT (JSON Web Token):** a signed string containing a small JSON payload (here: user id, email, tokenVersion). The server signs it with a secret. Anyone can *read* it, but nobody can *change* it without the secret.
- **Stateless:** the server doesn't store sessions; it just verifies the signature on each request.
- **Access token + refresh token:** the access token is short-lived (15 min) so a stolen one is only briefly useful. The refresh token is long-lived (7 days) and stored in an **httpOnly cookie** (JavaScript can't read it), used only to get a new access token.
- **tokenVersion (revocation trick):** JWTs can't be "deleted", so each user has a `tokenVersion` number. It's put inside the token. If the user clicks "log out everywhere", the version in the DB goes up by one, and every older token (with the old number) is rejected. This is clever and cheap.
- **Password hashing:** passwords are never stored. `bcrypt` turns them into a one-way hash (with a salt, cost 10). Login compares with `bcrypt.compare`.

### 2.3 MongoDB and Mongoose
- **MongoDB:** a document database. Data is stored as JSON-like documents inside collections (similar to rows inside tables, but flexible).
- **Mongoose:** a Node library that adds **schemas** (field types, required, enums), **validation** and a nicer query API on top of MongoDB.
- **ObjectId references:** documents point to each other by `_id` (e.g. a Log has `monitorId`). `populate()` swaps the id for the actual document when needed.
- **Index:** a lookup structure that makes a query fast, like a book's index. Without one, MongoDB scans every document.
- **TTL index:** an index that makes MongoDB **auto-delete** documents after a time. Used here for logs, events and exception events (30 days) so the database doesn't grow forever.
- **Aggregation pipeline:** a series of stages (`$match`, `$group`…) that compute things inside the database. Used for uptime % and average response time.
- **Atomic update:** one operation that can't be interleaved with another (e.g. `findOneAndUpdate` with `$inc`). Used to avoid race conditions.

### 2.4 Queues, workers, and Redis
- **Problem:** checking 100 monitors every minute inside the web server would slow the API and lose jobs if it crashed.
- **Queue:** a to-do list stored in Redis. The API (or a scheduler) **adds jobs**; a **worker** takes jobs and does them in the background.
- **BullMQ:** a Node library that implements this on top of Redis, with retries, delays, **repeatable jobs** ("every 5 minutes") and concurrency control.
- **Redis:** a very fast in-memory data store. Here it does two jobs: it backs the BullMQ queues, and it caches analytics results for 60 seconds.
- **Concurrency:** how many jobs one worker runs at once (5 for monitor checks, 1 for AI analysis).

### 2.5 Multi-tenancy and RBAC
- **Multi-tenant:** many separate customers ("tenants") share one app and one database, but must never see each other's data. Here a tenant = a **workspace**.
- **How isolation works:** every record stores `workspaceId`, and every query includes it. The workspace comes from the **verified** request (header + membership check), never from untrusted input alone.
- **RBAC (role-based access control):** each user has a role *per workspace*: OWNER, ADMIN, MEMBER or VIEWER. A middleware checks the role against the list of roles allowed for that route.

### 2.6 CORS and preflight (you hit this bug for real)
- **Same-origin policy:** a browser blocks a web page from reading responses from a different origin (different domain or port) unless the server allows it.
- **CORS:** headers the server sends to say "this origin is allowed".
- **Preflight:** for "non-simple" requests (custom headers like `x-workspace-id`, or JSON content), the browser first sends an `OPTIONS` request asking permission. If the response doesn't list that header in `Access-Control-Allow-Headers`, the browser **blocks the real request**. The server never even sees it.
- **Why curl/Postman worked:** they don't enforce CORS. It's a *browser* rule.

### 2.7 LLMs, tools, and agents
- **LLM:** a model that generates text. By itself it only knows its training data.
- **Function calling (tool use):** you describe functions to the model (name, description, parameters). Instead of answering, the model can reply "please call `get_recent_logs`". **Your code** runs the function and sends the result back.
- **Agent:** a loop around that: ask → model requests tools → run them → send results back → repeat until the model gives a final answer (or you hit a step cap).
- **Key safety idea:** *the model suggests, your code executes.* Ids and permissions come from your database, never from the model.
- **Prompt injection:** attacker-controlled text (an error message, a log line) that tries to give the model new instructions. Defense: tell the model that tool output is data, not instructions, cap what it can do, and never let it choose security-sensitive parameters.

---

## 3. Tech stack

| Layer | Choice | Why (your answer) | Alternative |
|---|---|---|---|
| Runtime | **Node.js 20** | Same language (TypeScript) on both sides; excellent for I/O-heavy work like making many network checks | Python/FastAPI, Go |
| Web framework | **Express 5** | Minimal, huge ecosystem, easy middleware chain | Fastify, NestJS |
| Language | **TypeScript** (strict) | Catches mistakes at compile time, self-documenting types | Plain JS |
| Database | **MongoDB (Mongoose 9)** | Flexible documents suit nested data (assertions, timelines, comments); easy TTL indexes for logs | PostgreSQL |
| Queue | **BullMQ + Redis (ioredis)** | Reliable repeatable jobs, retries, concurrency; keeps checks off the API thread | node-cron (not distributed), RabbitMQ, SQS |
| Cache | **Redis** | Analytics aggregation is expensive; cache for 60s | In-memory (lost on restart, not shared) |
| Auth | **JWT + bcryptjs + httpOnly refresh cookie** | Stateless, scales horizontally; short access token limits risk | Sessions, OAuth providers |
| Validation/safety | **Helmet, express-rate-limit, CORS** | Security headers, abuse control | — |
| Logging | **Winston** | Levels, JSON, files + console | pino |
| Email | **Nodemailer (SMTP)** | Provider-independent | SendGrid API |
| HTTP client | **Axios** | Timeouts, status handling | fetch/undici |
| AI | **Google Gemini (`@google/generative-ai`)** | Free tier available, supports function calling | Anthropic, OpenAI |
| Frontend | **React 18, Vite 5, TypeScript** | Fast dev server, component model | Next.js |
| Styling | **Tailwind CSS 3, lucide-react icons** | Fast consistent UI, dark mode | CSS modules, MUI |
| Routing | **react-router-dom 6** | Standard SPA routing | — |
| State | **React Context** (Auth, Workspace) + local state | Enough for this size | Redux, Zustand, React Query |
| Packaging | **Docker + docker-compose** | Reproducible local stack (Mongo, Redis, backend, nginx frontend) | — |
| Hosting | Backend on **Render**, Redis on **Upstash**; Mongo hosted (verify which provider you use) | Free tiers | — |

**Numbers worth remembering:** access token 15 min · refresh token 7 days · rate limit 1000 requests / 15 min / IP · log, event and exception-event TTL 30 days · monitor worker concurrency 5 · AI worker concurrency 1 · analytics cache 60 s · AI max tool rounds 6 · AI daily cap 30 per workspace.

---

## 4. Architecture and folder map

### 4.1 The big picture

```
                          ┌──────────────────────────────┐
   Browser (React SPA) ──▶│  Express API  (server.ts)    │
   localhost:5173         │  cors → helmet → json → rate │
                          │  limit → auth → RBAC → ctrl  │
                          └───────┬───────────────┬──────┘
                                  │               │
                        reads/writes         adds jobs
                                  │               │
                          ┌───────▼──────┐  ┌─────▼───────────────┐
                          │   MongoDB    │  │ Redis                │
                          │ users, ws,   │  │ • BullMQ queues:     │
                          │ monitors,    │  │   monitor-checks     │
                          │ logs, events,│  │   incident-analysis  │
                          │ incidents,   │  │ • analytics cache    │
                          │ workflows,   │  └─────┬────────────────┘
                          │ exceptions   │        │ jobs
                          └───────▲──────┘  ┌─────▼────────────────┐
                                  │         │ Workers (same process │
                                  └─────────│  today)               │
                                    updates │ • monitor worker (5x) │
                                            │ • AI analysis worker  │
                                            └─────┬─────────────────┘
                                                  │ HTTP/TCP/DNS/ping/TLS checks
                                                  ▼
                                          the monitored services
                                          (+ Gemini API for AI)
```

**Key point to say out loud:** the API and the workers currently run in the **same Node process** (`server.ts` starts both). They only talk to each other through Redis and MongoDB, so splitting them into separate services later is straightforward (deferred in the roadmap because it isn't needed at this scale).

### 4.2 Backend folder map (`backend/src`)

```
app.ts                  Express app: middleware chain, /healthz, /api/features, route mounting
server.ts               Entry point: connect Mongo → start workers → listen
config/redis.ts         Shared Redis client (cache + health check)

middlewares/
  auth.ts               Verifies JWT, checks user exists and tokenVersion
  rbac.ts               checkWorkspaceRole([...]) — loads workspace, checks membership + role

routes/                 URL → controller wiring, with auth + role requirements
  auth.routes.ts  workspace.routes.ts  monitor.routes.ts  workflow.routes.ts
  incident.routes.ts  exception.routes.ts

controllers/            Request handlers (parse input, call services, send response)
  auth / workspace / monitor / workflow / incident / exception .controller.ts

services/               Business logic (no Express types)
  monitor.service.ts        The 4 check types (HTTP, TCP, DNS, PING) + runs assertions
  monitor.retry.service.ts  Retry wrapper around a check
  assertion.service.ts      Evaluates assertion rules against a check result
  ssl.service.ts            Reads TLS certificate info
  analytics.service.ts      Uptime %, avg/min/max response time (Mongo aggregation)
  event.service.ts          Creates API_DOWN / API_UP / SLOW_RESPONSE events
  workflow.service.ts       Finds matching workflows, executes, records WorkflowExecution
  action.service.ts         Sends the actions (email, webhook, Slack, Teams)
  incident.service.ts       Opens/resolves incidents; triggers AI analysis
  llm.service.ts            Gemini client + isAiEnabled / isLlmConfigured
  ai.tools.ts               The 5 AI tools + dispatcher (tenant-scoped)
  incident.agent.ts         The agent loop, prompt, parsing, retries

jobs/
  monitor.queue.ts          Queue + add/remove repeatable job per monitor
  monitor.worker.ts         Worker: runs one check and the whole pipeline
  analysis.queue.ts         requestAnalysis() + incident-analysis queue
  analysis.worker.ts        Worker: runs the agent and saves the result

models/                 Mongoose schemas (see section 5)
types/                  Shared TypeScript interfaces
utils/                  logger.ts, actionValidation.ts, exceptionUtils.ts
scripts/                seed.ts, ai-eval.ts, llm-ping.ts, tools-check.ts
```

**Pattern to explain:** *routes → controller → service → model.* Routes decide who can call; controllers handle HTTP; services hold the logic; models talk to the database. This separation keeps logic reusable (the worker and the manual-check endpoint both call the same services).

### 4.3 Frontend folder map (`frontend/src`)

```
main.tsx, App.tsx       Entry + routes (/login, /dashboard, /monitors, /workflows,
                        /team, /incidents, /issues — all protected except /login)
context/
  AuthContext.tsx       token + user in state and localStorage; login/register/logout
  WorkspaceContext.tsx  list of workspaces, active workspace id (saved in localStorage)
lib/api.ts              ONE fetch wrapper (adds token + x-workspace-id, handles 401 refresh)
                        plus a typed function per endpoint
types.ts                TypeScript types mirroring API data
components/
  AppLayout.tsx, ProtectedRoute.tsx, MonitorForm.tsx, WorkflowForm.tsx
  AiAnalysisPanel.tsx   The AI result panel
  ui/                   Small reusable pieces (Button, Card, Modal, Table, Badge…)
pages/                  DashboardPage, MonitorDetailPage, WorkflowDetailPage,
                        IncidentPage, IssuesPage, IssueDetailPage, TeamSettingsPage, AuthPage
```

---

## 5. Data model

Ten collections. Almost every one carries `workspaceId` — that is the tenant boundary.

### 5.1 Relationship map

```
User ──┐
       ├─ member of ─▶ Workspace (members[] embedded: {userId, role})
       │                    │
       │                    ├──▶ Monitor ──▶ Log        (one per check, TTL 30d)
       │                    │       │  └───▶ Event      (API_DOWN/UP/SLOW, TTL 30d)
       │                    │       └─────▶ Incident    (timeline, comments, analysis)
       │                    ├──▶ Workflow ──▶ WorkflowExecution (history of runs)
       │                    └──▶ ExceptionIssue ──▶ ExceptionEvent (TTL 30d)
```

### 5.2 Collections in detail

**User** — `name`, `email` (unique, lowercase), `password` (bcrypt hash), `tokenVersion` (number, default 0), timestamps.

**Workspace** — `name`, `ownerId`, `members[]` where each member is `{ userId, role }` and role ∈ `OWNER | ADMIN | MEMBER | VIEWER`.
*Design note:* members are **embedded** (an array inside the workspace) instead of a separate collection. Good because a workspace has few members and you always load them together; bad if a workspace could have thousands of members.

**Monitor**
| Field | Notes |
|---|---|
| `name`, `url` | required |
| `type` | `HTTP` (default) · `TCP` · `PING` · `DNS` |
| `method` | `GET/POST/PUT/DELETE/PATCH` (HTTP only), default GET |
| `interval` | minutes between checks, default 5, min 1 |
| `retries` | 0–5, default 3 |
| `retryInterval` | seconds between retries, 5–60, default 10 |
| `port` | TCP only |
| `dnsRecordType` | `A, AAAA, CNAME, MX, TXT` (DNS only) |
| `assertions[]` | `{type, operator, value, target}` — see 6.3 |
| `status` | `UP / DOWN / UNKNOWN` (latest state) |
| `lastCheckedAt`, `lastResponseTime` | latest check summary |
| `sslInfo` | `{isHttps, validFrom, validTo, daysRemaining, issuer, isValid, isExpired, error}` |
| `workspaceId` | required, indexed |

**Log** — one document per check: `monitorId`, `workspaceId`, `status (UP/DOWN)`, `responseTime`, `statusCode`, `errorMessage`, `checkedAt`.
*Indexes:* compound `{monitorId, workspaceId, checkedAt:-1}` (fast "latest logs for this monitor"), and a **TTL index** on `checkedAt` (delete after 30 days).

**Event** — a *state-change signal*: `monitorId`, `workspaceId`, `type` (`API_DOWN | API_UP | SLOW_RESPONSE`), `message`, `previousStatus`, `currentStatus`, `responseTime`, `triggeredAt`. Same compound + TTL index pattern.

**Workflow** — `name`, `workspaceId`, `trigger` (one of the 3 event types), `conditions[]` (free-form, currently unused), `actions[]` (`{type, config}`), `enabled`.

**WorkflowExecution** — history of each run: `workflowId`, `eventId`, `monitorId`, `workspaceId`, `trigger`, `status (SUCCESS/FAILED)`, `actions[]`, `message`, `executedAt`.

**Incident** — `workspaceId`, `monitorId`, `title`, `status (TRIGGERED/ACKNOWLEDGED/RESOLVED)`, `severity (INFO/WARNING/CRITICAL)`, `assignedTo`, `acknowledgedAt`, `resolvedAt`, `timeline[]` (`{status, action, timestamp, userId}`), `comments[]`, and **`analysis`** (the AI result):
`{ status: PENDING|DONE|FAILED, probableCause, confidence: LOW|MEDIUM|HIGH, evidence[], nextSteps[], toolCalls[], model, error, requestedAt, completedAt }`.

**ExceptionIssue** (a *group* of identical errors) — `workspaceId`, `hash` (SHA-256 fingerprint), `errorType`, `message`, `status (UNRESOLVED/RESOLVED/IGNORED)`, `firstSeen`, `lastSeen`, `count`, and three Maps `browsers`, `os`, `urls` (counts per key). **Unique index on `{workspaceId, hash}`** so a workspace can't have two issues for the same fingerprint.

**ExceptionEvent** (one *occurrence*) — `issueId`, `workspaceId`, `errorType`, `message`, `stack`, `url`, `userAgent`, `browser`, `os`, `user`, `extra`, `timestamp`; TTL 30 days.

### 5.3 Design questions you should be able to answer
- *Why separate Event and Incident?* An **event** is a raw, automatic signal (a status changed). An **incident** is a *human-facing case* with an owner, timeline and resolution. One incident can cover a whole outage; events fire per change.
- *Why store `workspaceId` on Log/Event even though Monitor already has it?* So queries can filter by tenant directly and use indexes, without joining through Monitor. It's deliberate denormalization for speed and safety.
- *Why TTL indexes?* Logs grow without bound (a monitor every minute = 1,440 documents/day). TTL keeps storage bounded with zero code.

---

## 6. Feature walkthroughs

Each walkthrough: **what it does → files → how it works → things to say in an interview**.

### 6.1 Authentication

**Files:** `controllers/auth.controller.ts`, `middlewares/auth.ts`, `routes/auth.routes.ts`, `models/User.ts`; frontend `context/AuthContext.tsx`, `lib/api.ts`.

**Endpoints**
- `POST /api/auth/register` — creates the user (bcrypt hash, cost 10) **and a default workspace** with that user as OWNER, then returns an access token and sets the refresh cookie.
- `POST /api/auth/login` — checks email + `bcrypt.compare`, returns an access token.
- `POST /api/auth/refresh` — reads the `refreshToken` cookie, verifies it, checks `tokenVersion`, returns a new access token.
- `POST /api/auth/logout` — clears the cookie.
- `POST /api/auth/revoke` (protected) — `tokenVersion += 1`, invalidating every existing token for that user.

**The `auth` middleware (runs on every protected route)**
1. Read the `Authorization` header (`Bearer <token>` or raw token). No header → 401.
2. `jwt.verify(token, JWT_SECRET)` — checks signature and the 15-minute expiry.
3. Load the user from MongoDB. User gone → 401 "User no longer exists".
4. Compare `decoded.tokenVersion` with `user.tokenVersion`. Different → 401 "Session revoked".
5. Put the decoded payload on `req.user` and call `next()`.

*Note steps 3–4:* the middleware hits the database on **every** request. That's what makes instant revocation possible, at the cost of one lookup per request (could be cached).

**Frontend side**
- The access token and user are saved in `localStorage` (`api-monitor-token`, `api-monitor-user`).
- `lib/api.ts` wraps every request. On a **401** (not for login/register/refresh) it calls `/auth/refresh` with the cookie; if that works it saves the new token and **retries the original request**; if not it clears storage and sends the user to `/`.

**What to say**
- "Short-lived access token plus a long-lived httpOnly refresh cookie, with a `tokenVersion` so I can revoke all sessions instantly."
- Why httpOnly for the refresh token? JavaScript can't read it, so XSS can't steal it.
- Trade-off you made: the access token is in `localStorage` (readable by XSS) — acceptable because it lives only 15 minutes, but be honest that an in-memory token is stricter.

> ✅ **Fixed (good interview story):** `loginUser` originally did **not** set the refresh cookie (only `registerUser` did), so users who logged in were forced back to the login screen after 15 minutes. It now calls `setRefreshTokenCookie`. Cookie options are centralised in `refreshCookieOptions()` so set and clear always match; `secure` turns on automatically in production (or `COOKIE_SECURE=true`); for a frontend and API on *different sites* set `COOKIE_SAMESITE=none` (forces `Secure`) together with `CORS_ORIGINS`.

### 6.2 Workspaces and RBAC

**Files:** `controllers/workspace.controller.ts`, `routes/workspace.routes.ts`, `middlewares/rbac.ts`, `models/Workspace.ts`; frontend `context/WorkspaceContext.tsx`, `TeamSettingsPage.tsx`.

**Endpoints:** create workspace, list my workspaces, get one (with member names), invite member by email, change a member's role, remove a member.

**How `checkWorkspaceRole(allowedRoles)` works (the heart of tenant isolation)**
1. Get the workspace id from, in order: the `x-workspace-id` header, `req.params.workspaceId`, `req.body.workspaceId`, `req.query.workspaceId`. Missing → 400.
2. `Workspace.findById(id)`. Not found → 404.
3. Is `req.user.id` in `workspace.members`? No → 403 "not a member".
4. Is the member's role in `allowedRoles`? No → 403 "insufficient permissions".
5. Attach `req.workspace` and `req.userWorkspaceRole`, call `next()`.

Controllers then **always** query with `workspaceId: req.workspace._id`. Even if someone sends another workspace's monitor id, the filter `{_id, workspaceId}` returns nothing → 404.

**Role matrix (from the route files)**

| Capability | OWNER | ADMIN | MEMBER | VIEWER |
|---|:-:|:-:|:-:|:-:|
| View monitors, logs, analytics, events | ✅ | ✅ | ✅ | ✅ |
| Create / edit / delete monitors, run check | ✅ | ✅ | ✅ | ❌ |
| View workflows and executions | ✅ | ✅ | ✅ | ✅ |
| Create / edit / delete / test workflows | ✅ | ✅ | ✅ | ❌ |
| View incidents | ✅ | ✅ | ✅ | ✅ |
| Acknowledge / resolve / comment / assign / **AI analyze** | ✅ | ✅ | ✅ | ❌ |
| View exception issues and stats | ✅ | ✅ | ✅ | ✅ |
| Change issue status / delete issue | ✅ | ✅ | ✅ | ❌ |
| Invite / change role / remove members | ✅ | ✅ | ❌ | ❌ |

**Rules enforced in code:** you can only invite as ADMIN/MEMBER/VIEWER (nobody can create a second OWNER); the OWNER's role can't be changed or removed; inviting requires the person to **already have an account** (there's no email invitation flow).

**Frontend:** `WorkspaceContext` loads your workspaces, remembers the active one in `localStorage` (`api-monitor-workspace-id`), and `lib/api.ts` sends it as `x-workspace-id` on every request. If the saved id no longer exists it falls back to the first workspace.

**What to say:** "Authentication says *who you are*; the RBAC middleware says *what you can do in this workspace*. Every query is scoped by workspace, so a leaked id from another tenant is useless."

### 6.3 Monitors, check types, assertions, retries, SSL

**Files:** `services/monitor.service.ts`, `monitor.retry.service.ts`, `assertion.service.ts`, `ssl.service.ts`, `controllers/monitor.controller.ts`.

**The four check types** (`checkMonitor` picks one by `monitor.type`)

| Type | How | Timeout | UP when |
|---|---|---|---|
| HTTP | `axios` with the monitor's method, `validateStatus: () => true`, **no redirects followed** | 10 s | status code 200–399 |
| TCP | opens a raw `net.Socket` to `host:port` | 5 s | connection succeeds |
| DNS | `dns.promises.Resolver` for the chosen record type | default | the record lookup succeeds |
| PING | runs the OS `ping` program via `execFile` (**no shell**) after checking the host is a plain hostname or IP address | OS (10 s cap) | ping exits successfully |

Every check returns `{status, responseTime, statusCode?, errorMessage?, body?, ...}`.

**Assertions (`assertion.service.ts`)** — extra rules on top of "is it reachable?":
- Types: `STATUS_CODE`, `RESPONSE_TIME`, `TEXT_BODY`, `JSON_PATH` (e.g. `$.status` or `users[2].name`).
- Operators: `EQUALS, NOT_EQUALS, CONTAINS, NOT_CONTAINS, GREATER_THAN, LESS_THAN` (comparisons are on strings; the numeric ones parse numbers; CONTAINS is case-insensitive).
- All assertions must pass for UP. The first failure becomes the error message, e.g. `Assertion failed: JSON_PATH EQUALS ok (Actual: degraded)`.
- **Subtle behavior to know:** if the network check itself says DOWN (e.g. a 500 response, or timeout), the result stays DOWN even if your assertions pass. Assertions can only make a monitor **stricter**, never looser.

**Retries (`checkMonitorWithRetries`)** — a failing check is repeated up to `retries` times, waiting `retryInterval` seconds between attempts. If any attempt is UP, the monitor is UP. If all fail it's DOWN. Purpose: avoid false alarms from one-off network blips.

**SSL check (`checkSslCertificate`)** — for HTTPS URLs, opens a TLS socket, reads the certificate, computes `daysRemaining` and `isExpired`, with a 5-second timeout. It uses `rejectUnauthorized: false` **on purpose** so it can inspect expired/self-signed certificates instead of crashing. Runs **in parallel** with the main check (`Promise.all`).

**What to say:** "Four protocols behind one function. Assertions let a monitor mean 'the API returns `status: ok` in under 500 ms', not just 'the port is open'."

### 6.4 Scheduling and the worker pipeline (BullMQ)

**Files:** `jobs/monitor.queue.ts`, `jobs/monitor.worker.ts`, `controllers/monitor.controller.ts`.

**Scheduling**
- `createMonitor` saves the monitor and calls `addMonitorJob(id, interval)`, which adds a **repeatable job** named `ping-<monitorId>` to the `monitor-checks` queue: `repeat: { every: interval × 60,000 ms }`, `attempts: 3`, `backoff: 5000`, `removeOnComplete/Fail: true`.
- `updateMonitor`: if the interval changed, it removes the old repeatable job and adds a new one.
- `deleteMonitor`: removes the repeatable job.

**The worker (`startMonitorWorker`, concurrency 5)** — for each job `{monitorId}`:
1. Load the monitor from MongoDB (skip if deleted).
2. Remember `previousStatus`.
3. Run **in parallel**: `checkMonitorWithRetries(monitor)` and `checkSslCertificate(url)`.
4. Update the monitor: `status`, `lastCheckedAt`, `lastResponseTime`, `sslInfo`.
5. Insert a **Log** document.
6. `handleIncidentLifecycle(...)` — open or resolve an incident (6.8).
7. `createMonitorEvents(...)` — create events and run matching workflows (6.6, 6.7).
8. If anything throws, log it and **rethrow** so BullMQ retries the job.

The manual **"Check now"** endpoint (`POST /monitors/:id/check`) runs the *same* steps inline.

**Things to be ready to discuss**
- *Why a queue instead of `setInterval`/cron?* Survives restarts, retries, concurrency control, can scale to multiple workers, and doesn't block the API.
- *A real limitation:* retries `sleep` **inside** the job, so a monitor with 5 retries × 60 s occupies one of the 5 worker slots for up to 5 minutes. A handful of failing monitors can starve the others. Better design: re-enqueue a delayed retry job instead of sleeping.
- *Fixed:* schedules live only in Redis, so if Redis was wiped nothing would run. At startup `syncMonitorJobs()` now compares monitors in MongoDB with the repeatable jobs in Redis and **adds only the missing ones** (never removes or edits existing jobs; idempotent). Set `SYNC_MONITOR_JOBS=false` to skip it, e.g. against a demo/seed database whose monitors use fake URLs.
- *Connections:* the queue and each worker use their own Redis connection with `maxRetriesPerRequest: null` (BullMQ requires it), separate from the cache client.

### 6.5 Logs and analytics

**Files:** `models/Log.ts`, `services/analytics.service.ts`, `getMonitorLogs` / `getMonitorAnalytics` in `monitor.controller.ts`.

- **Logs** are paginated (`?page=&limit=`) and sorted newest first, using the compound index.
- **Analytics** use one MongoDB **aggregation**: `$match` (this monitor + workspace) → `$group` with `$sum` / `$cond` (count UP vs DOWN) and `$avg`, `$min`, `$max` of `responseTime`. Output: `totalChecks, upChecks, downChecks, uptimePercentage (2 dp), averageResponseTime, fastest, slowest, failureCount`.
- **Caching:** the result is stored in Redis under `monitor:analytics:<monitorId>:<workspaceId>` with a **60-second TTL**. First request = cache miss → compute → store; next requests within 60 s = cache hit. The workspace id in the key keeps tenants separate.

**What to say:** "Computing uptime over thousands of logs on every dashboard refresh is wasteful, so I aggregate in the database and cache for 60 seconds — a classic read-heavy optimization. The trade-off is up to 60 seconds of staleness."

*Gap to know:* if Redis is down, `getMonitorAnalytics` throws (the `redisClient.get` call isn't wrapped), so the endpoint returns 500. A resilient version would fall back to computing without cache.

---

### 6.6 Events

**Files:** `services/event.service.ts`, `models/Event.ts`.

After every check the worker calls `createMonitorEvents` with the previous status and the new result. It creates **zero to two** events:

| Event | Created when |
|---|---|
| `API_DOWN` | previous status was **not** DOWN and the new status is DOWN |
| `API_UP` | previous status was DOWN and the new status is UP (recovery) |
| `SLOW_RESPONSE` | new status is UP **and** `responseTime > 1000` ms |

Events are saved with `insertMany`, then for each event `runWorkflowsForEvent` is called (6.7).

**Notes**
- `API_DOWN`/`API_UP` fire only on **transitions**, so you don't get an alert every minute during an outage.
- `SLOW_RESPONSE` now fires only when a monitor **becomes** slow: no event if the previous check was already slow (`previousResponseTime` is passed in by the worker and the manual check). It fires again after the monitor has recovered to fast and then slows down again.
- The 1000 ms threshold is a hard-coded constant, not per-monitor.

### 6.7 Workflows and actions

**Files:** `services/workflow.service.ts`, `services/action.service.ts`, `utils/actionValidation.ts`, `controllers/workflow.controller.ts`, `models/Workflow.ts`, `models/WorkflowExecution.ts`.

**Idea:** "When *this event* happens in *this workspace*, do *these actions*." (n8n-style automation, simplified.)

**Flow:** event created → `runWorkflowsForEvent` finds workflows with `{workspaceId, trigger: event.type, enabled: true}` → `executeWorkflow` runs each action in order → saves a `WorkflowExecution` with `SUCCESS` or `FAILED` and a message.

**Action implementations in `action.service.ts`**
| Action | What it does |
|---|---|
| `EMAIL` | Nodemailer with SMTP settings from env (`SMTP_HOST/PORT/SECURE/USER/PASS/FROM`); sends `to`, `subject`, and a default body with workflow, monitor, trigger and message |
| `WEBHOOK` | `POST`s JSON `{event, monitorId, monitorName, message, workflowName, triggeredAt}` to your URL with optional custom headers, 10 s timeout |
| `SLACK` | Posts a colored attachment (green for UP, red otherwise) to a Slack incoming-webhook URL |
| `TEAMS` | Posts a `MessageCard` to a Microsoft Teams webhook URL |

Each action validates its own config (type guards like `isEmailActionConfig`) and throws a clear error if the config is wrong.

> ✅ **All four channels are now enabled and validated.** `EMAIL`, `WEBHOOK`, `SLACK` and `TEAMS` are accepted by `validateWorkflowActions` (webhook/Slack/Teams URLs must be valid http(s); webhook headers must be single-line strings with valid names, max 20), executed by the workflow service, and stored in `WorkflowExecution`. Unknown config keys are stripped (`normalizeWorkflowActions`). Email was verified through the code path; webhook/Slack/Teams were verified against a local listener (payloads, headers, colors). **Outbound SSRF guard:** these senders refuse private/internal targets (loopback, 10.x, 172.16–31.x, 192.168.x, 169.254.169.254, IPv6 equivalents), check the address at connection time (defeats DNS rebinding), don't follow redirects, and time out after 10 s. `ALLOW_PRIVATE_WEBHOOK_TARGETS=true` disables the guard for local testing only.

**Other behaviors**
- `POST /workflows/:id/test` runs a workflow immediately with a fake event so you can test email delivery without waiting for an outage.
- If one action throws, the whole execution is recorded as `FAILED` (later actions don't run). A failed action never crashes the worker.
- Workflows are tenant-scoped (queries include `workspaceId`).
- `conditions[]` exists in the model but isn't used yet.

### 6.8 Incident management

**Files:** `services/incident.service.ts`, `controllers/incident.controller.ts`, `routes/incident.routes.ts`, `models/Incident.ts`; frontend `pages/IncidentPage.tsx`.

**Auto lifecycle (`handleIncidentLifecycle`, called by the worker and by manual checks)**
- **Opens** an incident when `previousStatus !== "DOWN"` and the new status is DOWN — **if no active incident (TRIGGERED or ACKNOWLEDGED) already exists** for that monitor (prevents duplicates). Title: `Service "<name>" is DOWN`, severity `CRITICAL`, first timeline entry records the status code and error. It then calls `requestAnalysis(id)` (fire-and-forget) for the AI feature.
- **Auto-resolves** when `previousStatus === "DOWN"` and the new status is UP: marks it RESOLVED, sets `resolvedAt`, adds a timeline entry with the response time.
- The whole function is wrapped in `try/catch` so an incident error never breaks the check pipeline.

**Human actions (all workspace-scoped, roles OWNER/ADMIN/MEMBER)**
| Endpoint | Rule |
|---|---|
| `POST /:id/acknowledge` | Only from `TRIGGERED`; assigns it to you, sets `acknowledgedAt`, adds a timeline entry |
| `POST /:id/resolve` | Not allowed if already `RESOLVED`; adds a timeline entry with who did it |
| `POST /:id/comments` | Adds a note (`userId`, `userName`, `content`, timestamp) |
| `POST /:id/assign` | Target must be a workspace member; moves TRIGGERED → ACKNOWLEDGED |
| `POST /:id/analyze` | Requests the AI analysis (6.10) |

**List filters:** `status`, `severity`, `assignedTo` (`me`, `unassigned`, or a user id).

**Things to say:** "Incident status is a small state machine: TRIGGERED → ACKNOWLEDGED → RESOLVED. The system moves it automatically for outages, humans move it for ownership."
*Edge to know:* the first-ever check of a new monitor goes UNKNOWN → DOWN, which **does** open an incident (since UNKNOWN is not DOWN).

### 6.9 Exception tracking (the mini-Sentry)

**Files:** `controllers/exception.controller.ts`, `utils/exceptionUtils.ts`, `routes/exception.routes.ts`, models `ExceptionIssue` and `ExceptionEvent`; frontend `IssuesPage.tsx`, `IssueDetailPage.tsx`.

**Goal:** collect errors from *other people's* web apps (client-side JavaScript), group the duplicates, and show them in a dashboard.

**The SDK** — `GET /api/errors/sdk.js` returns a tiny JavaScript file (cached 1 hour). A customer adds one `<script>` tag with `data-workspace-id`. It auto-captures `window.error` and `unhandledrejection` events and sends them with `navigator.sendBeacon` (reliable even when the page is unloading), falling back to `fetch`. It exposes `MiniSentry.captureException(error, extra)` for manual use.

**Ingestion (`POST /api/errors/ingest`, public — no login)**
1. Needs a `workspaceId` (body or `x-workspace-id` header); verifies the workspace exists.
2. Extracts type, message, stack, URL, user agent.
3. **Fingerprints the error** with `computeExceptionHash`: SHA-256 of `type : message-with-numbers-replaced-by-{num} : top 2 stack frames with line/column numbers and domain removed`. So "User 102 failed" and "User 457 failed" from different line numbers still group together.
4. Parses browser and OS from the user agent with a small hand-written parser.
5. **Atomic upsert:** one `findOneAndUpdate` with `upsert: true` that creates the issue the first time (`$setOnInsert`) and otherwise updates `lastSeen` and increments `count` plus the per-browser/OS/URL counters (`$inc`). The unique index on `{workspaceId, hash}` prevents duplicate issues even under concurrent requests.
6. Saves one `ExceptionEvent` (the individual occurrence, with full stack).

**Dashboard endpoints (auth + role):** list issues (filter by status, text search, sort by lastSeen/count/firstSeen, pagination), get issue, get its events (paginated), update status, delete (also deletes its events), and `/stats` (unresolved count, total, and a 7-day per-day timeline built with an aggregation `$group` on a formatted date).

**Honest weak spots:** ingestion is unauthenticated and keyed only by `workspaceId` (an ObjectId that isn't a secret), so anyone who learns it can send junk. Real Sentry uses a secret DSN key. The text search uses `$regex` from user input (use escaping or a text index to avoid expensive patterns).

### 6.10 The AI incident analyst (your showpiece)

**Goal:** when an outage opens, an agent investigates and writes: probable cause, confidence, evidence, and next steps.

**Files:** `services/llm.service.ts`, `ai.tools.ts`, `incident.agent.ts`; `jobs/analysis.queue.ts`, `analysis.worker.ts`; `Incident.analysis` in the model; frontend `components/AiAnalysisPanel.tsx`.

#### A. Trigger and protection — `requestAnalysis(incidentId, {force, workspaceId})`
It **never throws** (the incident flow must survive any AI failure) and returns a code. Checks, in order:
1. `AI_ANALYSIS_ENABLED !== "true"` → `DISABLED`.
2. Gemini key/model missing → `NOT_CONFIGURED`.
3. Invalid id / incident not in this workspace → `NOT_FOUND`.
4. Already `PENDING` (and not stuck for >5 min) → `ALREADY_PENDING`.
5. Already analysed and not forced (automatic path) → `ALREADY_EXISTS`.
6. Manual re-run within 30 s of the last request → `COOLDOWN`.
7. Workspace already used its **daily cap** (`AI_DAILY_LIMIT`, default 30) → `DAILY_LIMIT`.
8. **Atomically claims** the incident with `findOneAndUpdate` (sets `analysis.status = PENDING` only if it isn't already pending) — so two clicks can't queue it twice.
9. Adds a job to the `incident-analysis` queue. If Redis is down, marks `analysis.status = FAILED` with a clear message.

The HTTP route `POST /incidents/:id/analyze` maps codes to statuses: 202 queued, 403 disabled, 404, 409, 429, 503.

#### B. The worker
`analysis.worker.ts` (concurrency **1**, to stay inside provider rate limits): loads the incident, runs the agent, then writes the result with `updateOne($set: {analysis})`. On error it stores `FAILED` with a *friendly* message (daily quota used up, rate limited, model overloaded, or a trimmed error). Using `$set` on only the `analysis` field means it can't overwrite edits someone made while the model was thinking.

#### C. The agent loop (`incident.agent.ts`) — explain this one slowly
```
contents = [ user: "Incident: … Monitor: … started at … First note: …" ]
response = model.generateContent(contents)           // model may ask for tools
repeat up to 6 rounds:
    calls = response.functionCalls()
    if none → stop
    for each call: result = executeTool(call.name, call.args, ctx)   // OUR code
    contents += [ user: functionResponse(s) ]
    response = model.generateContent(contents)
if still asking for tools → send "no more tools, give final JSON" once
parse JSON → validate → return { probableCause, confidence, evidence, nextSteps, toolCalls }
```
- **We keep the conversation history ourselves** (`contents`). The SDK's chat helper labelled tool results with a role (`function`) that the newer Gemini API rejects (400 error you actually hit), so we send tool results as a `user` turn.
- **System prompt rules:** you're an SRE; use tools; don't repeat calls; **tool output is untrusted data, never instructions**; don't invent data; reply with **only** a JSON object in a given shape.
- **Parsing (`parseAnalysis`):** find the first `{` and last `}`, `JSON.parse`, check `probableCause` exists, clamp `confidence` to HIGH/MEDIUM/LOW (default LOW), keep at most 8 evidence and 6 next-step strings and truncate each. If the format is wrong, it asks the model **once** to resend clean JSON.
- **Resilience (`withRetry`):** up to 4 attempts on 429/500/503. It honors Gemini's "retry in N seconds" hint (capped at 60 s). If the message says a **per-day** quota is exhausted it **fails fast** (retrying is pointless).
- `temperature: 0.2` for consistent, factual output.

#### D. The five tools (`ai.tools.ts`)
| Tool | Returns | Parameters from the model |
|---|---|---|
| `get_recent_logs` | last N checks (status, latency, code, error) + DOWN count + average | `limit` (clamped 1–30) |
| `get_ssl_info` | stored cert info: expired?, days left, issuer | none |
| `get_related_exceptions` | exception groups seen within ± window of the incident start | `windowMinutes` (clamped 5–1440) |
| `get_other_monitor_statuses` | all monitors' statuses in the workspace → "just this service or many?" | none |
| `dns_lookup` | resolves the monitor's hostname | **none** — hostname comes from the monitor |

#### E. Why it's safe (say this in the interview)
1. **Model suggests, code executes.** The model only sends a tool *name* and tiny numeric args.
2. **Ids never come from the model.** `workspaceId`, `monitorId` and the incident time are read from the incident in the database (`ToolContext`), so every query is hard-scoped to the tenant.
3. **`clamp()` and `clip()`** bound numbers and string lengths, so the model can't request huge queries or inject giant text.
4. **`dns_lookup` takes no hostname** — otherwise the model could be tricked into probing internal addresses (SSRF).
5. **Prompt-injection stance:** logs/errors are treated as data in the prompt; the model has no dangerous tools (read-only), so even a successful injection can only change *the text of the diagnosis*.
6. **Bounded:** max 6 tool rounds, 1 worker at a time, daily cap, cooldown, claim lock.
7. **Graceful failure:** any problem becomes `analysis.status = FAILED` — incidents work exactly as before.
8. **Master switch:** `AI_ANALYSIS_ENABLED` (default off) disables the endpoint, auto-trigger and worker, **strips `analysis` from every incident response**, and the frontend hides the panel (it asks `GET /api/features`).

#### F. Frontend panel
`AiAnalysisPanel` shows four states: none (explains the feature), PENDING (spinner, and the incident page polls every 3 s), FAILED (readable error), DONE (probable cause with confidence badge, evidence list, numbered next steps, and a collapsible "Data the agent examined" listing each tool call and its summary). It always says "AI-generated… verify before acting". Viewers can see results but can't run analysis. React escapes the text, so model output can't inject HTML.

#### G. Testing it
- `npm run seed` creates four scenarios with known answers: database outage (exceptions mention postgres), expired SSL, DNS failure, and flaky 503s.
- `npm run ai:eval` runs the agent on each and checks the diagnosis text and tool usage against expectations, printing PASS/FAIL (it pauses between scenarios for the free-tier limit). **Status:** 2 of 4 verified before the free-tier daily quota ran out — rerun it and quote the final score.
- **Gemini free-tier limits to remember:** about 5 requests/minute and about 20/day per model; one analysis uses roughly 2–3 requests.

### 6.11 Frontend

**Stack:** React 18 + TypeScript + Vite, Tailwind, react-router 6, lucide icons. No state library — Context plus component state is enough here.

**Routing (`App.tsx`):** `/login` (redirects to `/dashboard` if you have a token); everything else sits inside `<ProtectedRoute><AppLayout/></ProtectedRoute>`: `/dashboard`, `/monitors[/:id]`, `/workflows[/:id]`, `/team`, `/incidents[/:id]`, `/issues[/:id]`. Unknown paths redirect.

**The API wrapper (`lib/api.ts`) — the most important frontend file**
- Base URL: `VITE_API_BASE_URL`, otherwise `localhost:5000/api` on localhost or the Render URL elsewhere.
- Every call adds `Authorization: Bearer <token>` and `x-workspace-id: <active workspace>`, with `credentials: "include"` for the refresh cookie.
- On 401 it tries `/auth/refresh` once, retries the request, or logs the user out.
- Non-OK responses throw `Error(message)` using the server's `message`, which pages display.

**Pages** load data in `useEffect` when `token` and `activeWorkspaceId` are both ready (this is exactly why the missing CORS header made pages look empty: no workspace → no fetch).

**Monitor page:** list with search, status/method filters, sorting and pagination (8 per page, client-side); detail view with logs, events, analytics; form with assertions. **Dashboard:** counts of monitors up/down, average response time and a recent-monitors list. The "SSL expiring" card now counts HTTPS monitors whose certificate is expired or expires within 14 days (the same threshold the monitor detail page uses).

### 6.12 Infrastructure, config and tooling

**Express app setup (`app.ts`), in order:** CORS → explicit `OPTIONS` handler → Helmet → cookie-parser → JSON body parser → JSON-error handler → rate limiter on `/api` → `GET /healthz` → `GET /api/features` → routers → root greeting → global error handler. `trust proxy` is set to 1 because Render sits behind a proxy (so rate limiting sees real client IPs).

**Health check:** `GET /healthz` reports MongoDB (`readyState === 1`) and Redis (`status === "ready"`) and returns 200 or 503.

**Logging (Winston):** levels via `LOG_LEVEL`; console output plus `logs/error.log` and `logs/combined.log` (JSON lines with timestamps).

**Environment variables**
| Variable | Purpose |
|---|---|
| `PORT` | server port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `REDIS_URL` | Redis (`rediss://` enables TLS for Upstash) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | token signing (refresh falls back to `JWT_SECRET + "-refresh"`) |
| `SMTP_HOST/PORT/SECURE/USER/PASS/FROM` | email alerts |
| `LOG_LEVEL` | log verbosity |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | AI provider |
| `AI_ANALYSIS_ENABLED` | master switch (exactly `"true"` to enable) |
| `AI_DAILY_LIMIT` | per-workspace daily AI analyses (default 30) |
| `COOKIE_SECURE` | force the refresh cookie to be `Secure` (automatic when `NODE_ENV=production`) |
| `COOKIE_SAMESITE` | set to `none` only for a cross-site frontend/API (forces `Secure`) |
| `CORS_ORIGINS` | comma-separated allowed browser origins; empty = reflect any origin (dev only) |
| `ALLOW_PRIVATE_WEBHOOK_TARGETS` | `true` disables the SSRF guard for webhook/Slack/Teams (local testing only) |
| `SYNC_MONITOR_JOBS` | `false` skips re-creating missing check schedules at startup |
| `SEED_MONGO_URI` | database used by `npm run seed` only |
| Frontend: `VITE_API_BASE_URL` | backend API base URL |

**Docker:** `docker-compose.yml` defines four services — `mongodb` (mongo:6 with a volume), `redis` (redis:7-alpine), `backend` (multi-stage Dockerfile: build TypeScript, then run production dependencies only) and `frontend` (built and served by nginx on port 5173→80). The compose file contains placeholder secrets (`JWT_SECRET=super_secret…`) which must be changed for any real deployment.

**Scripts (`backend/package.json`):** `dev` (ts-node-dev with auto-restart), `build` (tsc), `start`, `seed`, `ai:eval`.

**Seeding (`scripts/seed.ts`):** creates a Demo Workspace for `demo@example.com` / `Demo@1234` with six monitors (healthy, slow, flaky, down, expired SSL, DNS failure), seven days of logs, five incidents and three exception issues. Safe by design: it reads `SEED_MONGO_URI` (not `MONGO_URI`) and refuses to run if they're identical.

---

## 7. End-to-end flows, step by step

These are the stories to tell on a whiteboard. Practice drawing each one.

### Flow A — Logging in and making a protected request

1. The user submits the login form → `POST /api/auth/login` (`{email, password}`).
2. Browser first sends a **CORS preflight** (`OPTIONS`) because of the JSON body; Express answers `200` with the allowed origin/headers.
3. `loginUser` finds the user, runs `bcrypt.compare`, signs a 15-minute JWT `{id, email, tokenVersion}`, and returns `{token, user}`.
4. React saves them in `localStorage`; `WorkspaceContext` calls `GET /api/workspaces` and picks the active workspace.
5. A page asks for monitors: `GET /api/monitors` with headers `Authorization: Bearer …` and `x-workspace-id: …`. (This request is also preflighted — **`x-workspace-id` must be in `allowedHeaders`**, which was your real bug.)
6. Server: `cors → helmet → json → rateLimit → auth` (verify JWT, load user, compare `tokenVersion`) `→ checkWorkspaceRole` (load workspace, confirm membership and role) `→ getMonitors` (`Monitor.find({workspaceId})`).
7. JSON comes back; React stores it in state and renders the table.

### Flow B — Creating a monitor (how scheduling starts)

1. User fills `MonitorForm` → `POST /api/monitors` (roles OWNER/ADMIN/MEMBER).
2. `createMonitor` saves the document with `workspaceId` from the verified workspace.
3. `addMonitorJob(id, interval)` registers a **repeatable BullMQ job** in Redis: "run `ping-<id>` every *interval* minutes".
4. From now on Redis hands that job to a worker on schedule — no further API calls.

### Flow C — An outage, from detection to alert (the main story)

1. **Scheduled check:** BullMQ delivers `{monitorId}` to the monitor worker (up to 5 jobs in parallel).
2. **Check:** worker loads the monitor; runs the check (HTTP/TCP/DNS/PING) **with retries**, plus the SSL check, in parallel. Assertions are applied to the result.
3. **Persist:** updates `status`, `lastCheckedAt`, `lastResponseTime`, `sslInfo`; inserts a `Log`.
4. **Incident:** previous status was UP, now DOWN, no active incident → create `Incident` (`TRIGGERED`, severity CRITICAL, timeline entry). Then `requestAnalysis(incidentId)` is fired and forgotten.
5. **Event:** an `API_DOWN` event is saved.
6. **Workflow:** workflows in this workspace with trigger `API_DOWN` and `enabled: true` run; the email action sends via SMTP; a `WorkflowExecution` (SUCCESS/FAILED) is recorded.
7. **AI (if enabled):** the analysis job runs in the background (Flow E).
8. **Human:** an engineer opens the incident page, reads the AI panel, acknowledges (assigned to them), comments, and later resolves — or the service recovers.
9. **Recovery:** next check is UP, previous was DOWN → `API_UP` event, incident auto-resolved with a timeline entry.

### Flow D — A browser error reaching the Issues page

1. A customer's page includes `…/api/errors/sdk.js` with their `workspaceId`.
2. A runtime error fires → the SDK `sendBeacon`s `POST /api/errors/ingest`.
3. Server verifies the workspace, computes the SHA-256 fingerprint, parses the user agent.
4. **Atomic upsert** creates or updates the `ExceptionIssue` (`count++`, `lastSeen`, browser/OS/URL counters); an `ExceptionEvent` stores this single occurrence.
5. The Issues page lists issues sorted by last seen; the detail page shows the stack, counters and recent events.

### Flow E — AI analysis of an incident

1. Trigger: incident opened (automatic) or **Analyze with AI** clicked (`POST /incidents/:id/analyze`).
2. `requestAnalysis` applies the guards (switch, config, pending, cooldown, daily cap), atomically sets `analysis.status = PENDING`, and enqueues a job. The API answers `202`.
3. The page shows a spinner and polls the incident every 3 s.
4. The AI worker runs the agent: Gemini asks for tools → `executeTool` runs each against MongoDB (scoped to the incident's workspace/monitor) → results go back → repeat (max 6 rounds).
5. Gemini returns JSON; `parseAnalysis` validates and trims it.
6. The worker `$set`s `analysis` as `DONE` (or `FAILED` with a friendly message).
7. The next poll sees `DONE` and the panel renders cause, evidence, next steps and the tool trail.

### Flow F — The access token expires

1. A request returns `401` (expired token).
2. `lib/api.ts` calls `/auth/refresh`, which uses the httpOnly cookie.
3. If a new token comes back, it's stored and the **original request is retried** transparently.
4. If refresh fails (no cookie, expired, revoked) → storage cleared, user sent to the login page.
   *(Known bug: users who logged in rather than registered have no cookie — see 6.1.)*

---

## 8. API reference

Base path `/api`. "Roles" = who passes `checkWorkspaceRole`. All workspace-scoped routes need header `x-workspace-id`.

### Public / system
| Method | Path | Purpose |
|---|---|---|
| GET | `/healthz` | Mongo + Redis status (200/503) |
| GET | `/api/features` | `{aiAnalysis: boolean}` — which optional features are on |
| GET | `/api/errors/sdk.js` | Browser SDK for error tracking |
| POST | `/api/errors/ingest` | Receive a client exception (no auth) |

### Auth
| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create user + default workspace |
| POST | `/auth/login` | Get access token |
| POST | `/auth/refresh` | New access token from the cookie |
| POST | `/auth/logout` | Clear refresh cookie |
| POST | `/auth/revoke` 🔒 | Invalidate all sessions |

### Workspaces
| Method | Path | Roles |
|---|---|---|
| POST | `/workspaces` 🔒 | any logged-in user |
| GET | `/workspaces` 🔒 | any logged-in user (only yours) |
| GET | `/workspaces/:workspaceId` | all roles |
| POST | `/workspaces/:workspaceId/members` | OWNER, ADMIN |
| PUT | `/workspaces/:workspaceId/members/:memberUserId` | OWNER, ADMIN |
| DELETE | `/workspaces/:workspaceId/members/:memberUserId` | OWNER, ADMIN |

### Monitors
| Method | Path | Roles |
|---|---|---|
| POST | `/monitors` | OWNER, ADMIN, MEMBER |
| GET | `/monitors`, `/monitors/:id` | all |
| PUT / DELETE | `/monitors/:id` | OWNER, ADMIN, MEMBER |
| POST | `/monitors/:id/check` | OWNER, ADMIN, MEMBER (manual check) |
| GET | `/monitors/:id/logs` | all (paginated) |
| GET | `/monitors/:id/analytics` | all (cached 60 s) |
| GET | `/monitors/:id/events` | all (paginated) |

### Workflows
| Method | Path | Roles |
|---|---|---|
| POST / PUT / DELETE | `/workflows`, `/workflows/:id` | OWNER, ADMIN, MEMBER |
| GET | `/workflows` | all |
| GET | `/workflows/:id/executions` | all |
| POST | `/workflows/:id/test` | OWNER, ADMIN, MEMBER |

### Incidents
| Method | Path | Roles |
|---|---|---|
| GET | `/incidents`, `/incidents/:id` | all (filters: status, severity, assignedTo) |
| POST | `/incidents/:id/acknowledge` | OWNER, ADMIN, MEMBER |
| POST | `/incidents/:id/resolve` | OWNER, ADMIN, MEMBER |
| POST | `/incidents/:id/comments` | OWNER, ADMIN, MEMBER |
| POST | `/incidents/:id/assign` | OWNER, ADMIN, MEMBER |
| POST | `/incidents/:id/analyze` | OWNER, ADMIN, MEMBER (needs AI switch on) |

### Error tracking
| Method | Path | Roles |
|---|---|---|
| GET | `/errors/issues`, `/errors/issues/:id`, `/errors/issues/:id/events`, `/errors/stats` | all |
| PUT | `/errors/issues/:id/status` | OWNER, ADMIN, MEMBER |
| DELETE | `/errors/issues/:id` | OWNER, ADMIN, MEMBER |

---

## 9. Security review

### 9.1 What you did well (say these)
- Passwords hashed with **bcrypt**; never returned.
- **Short-lived access token + httpOnly refresh cookie**, and **`tokenVersion`** for instant global logout.
- **Tenant isolation** on every workspace-scoped query (`{_id, workspaceId}`), enforced by one middleware.
- **RBAC** with a clear role matrix; owner can't be demoted or removed; no second owner.
- **Helmet** security headers, **rate limiting**, `trust proxy` configured for the hosting proxy.
- **AI safety design:** read-only tools, ids from the DB not the model, bounded inputs/outputs, injection-aware prompt, caps, kill switch, and server-side stripping of AI data when disabled.
- Health check, structured logging, TTL cleanup, seed script that refuses to touch the main DB.

### 9.2 Issues found in review, and their status

These were found by reading the code and then **fixed and tested** (API tests on an isolated stack plus service-level tests). Tell each one as a story: *what was wrong → how it could be abused → the fix → how you verified it.*

| # | Severity | Issue (as found) | Fix | Status |
|---|---|---|---|---|
| 1 | **High** | **Command injection in PING monitors.** `checkPing` built `ping -c 1 ${host}` and ran it through `exec` (a shell). Characters like `;`, `&`, backticks and `$(…)` survive `new URL()`, so a non-viewer member could run commands on the server | `execFile("ping", [..., host])` (no shell, 10 s timeout) + strict hostname/IP validation (`isSafePingHost`), also rejected at monitor create/update with a 400 | ✅ Fixed |
| 2 | High (functional) | **Login didn't set the refresh cookie** → forced logout after 15 minutes | `loginUser` sets it; cookie options centralised; `Secure`/`SameSite` configurable | ✅ Fixed |
| 3 | Medium | **Mass assignment:** update endpoints passed `req.body` to `findOneAndUpdate` (a caller could overwrite `workspaceId`, `status`...) | Field whitelists (`pick`) on create and update for monitors and workflows; updates use `$set` | ✅ Fixed |
| 4 | Medium | **Slack/Teams/webhook actions were gated off** (validation allowed only EMAIL) | All four enabled with per-type validation, config sanitising, and an SSRF-safe sender | ✅ Fixed |
| 5 | Medium | **SSRF** once webhooks are enabled (a user could point them at internal addresses) | `outboundGuard`: blocks private/internal targets, checks at connect time, no redirects | ✅ Added with #4 |
| 6 | Low | `SLOW_RESPONSE` spam; schedules lost after a Redis reset; dashboard SSL card hard-coded to 0 | De-dup on "becomes slow"; startup `syncMonitorJobs`; real SSL count | ✅ Fixed |
| 7 | Medium | **CORS reflects any origin with credentials** | Optional `CORS_ORIGINS` allowlist added. **Default is still permissive** (so nothing breaks); set it in production | ⚠️ Opt-in |
| 8 | Medium | **Public error ingestion** keyed only by a guessable `workspaceId` | — | ❌ Open: per-workspace secret key + rate limit |
| 9 | Low–Med | Login brute force: global limit (1000 requests / 15 min / IP) too generous for `/auth/login` | — | ❌ Open: stricter limiter on auth routes |
| 10 | Low | Access token in `localStorage`; in-memory rate limiter (`rate-limit-redis` unused); user-supplied `$regex` in search; no request-schema validation library; placeholder secrets in `docker-compose.yml` | — | ❌ Open |

**Other behaviours to know (not bugs):** monitors can still target internal addresses (that's what a monitoring tool does; for a hosted multi-tenant version you'd restrict it); SSRF protection currently covers outbound *alerts*, not the checks themselves.

### 9.3 What is still open (be upfront)
- Public error ingestion has no secret key; login has no dedicated rate limit.
- CORS allowlist is opt-in, not enforced by default.
- **No automated tests and no CI yet** (the fixes above were verified with throwaway test scripts that were not kept).
- The worker still runs inside the API process, and retries still `sleep` inside the job (occupying a worker slot).
- Email delivery depends on valid SMTP settings; webhook/Slack/Teams were tested against a local listener, not real Slack/Teams.

---

## 10. Limitations and improvements

### 10.1 "How would you scale this to 100,000 monitors?" (outline)
1. **Separate the workers** from the API (own entry point/service) and scale them horizontally — BullMQ already distributes jobs safely across workers.
2. **Don't sleep inside jobs:** turn retries into delayed jobs so slots free up.
3. **Tune concurrency** per worker and add **backpressure**/rate limits for outbound checks (don't DDoS your customers or exhaust sockets).
4. **Spread schedule load:** add jitter so 10,000 monitors with a 5-minute interval don't all fire in the same second.
5. **Logs:** switch to MongoDB **time-series collections** (or a TSDB), batch inserts, keep the TTL, pre-aggregate rollups (hourly/daily uptime) instead of aggregating raw logs on read.
6. **Database:** index review, read replicas for dashboards, shard by `workspaceId` if needed.
7. **Cache:** keep Redis for analytics; add cache invalidation on new checks if freshness matters.
8. **Multi-region checking** to avoid false positives from one vantage point.
9. **Observability:** metrics (queue depth, job latency, failure rate), alerting on the monitor itself, tracing.
10. **Reliability:** reconcile schedules on startup, idempotent jobs, dead-letter handling.

### 10.2 Next improvements, in priority order
1. ✅ Done: PING injection, login cookie, update whitelisting, all alert channels, slow-event de-dup, schedule sync, dashboard SSL card.
2. Add schema validation (Zod/Joi) for request bodies; enforce a CORS allowlist in production.
3. Tests (unit: assertions, parseAnalysis, tools scoping; integration: incident lifecycle, RBAC) + CI.
4. Verify Slack/Teams/webhook against real services; retry failed alert actions.
5. Split worker from API; reconcile schedules at startup.
6. Charts and live updates (Socket.io) on the dashboard.
7. Public status pages, heartbeat (push) monitoring, OAuth login.

---

## 11. Glossary

| Term | Meaning |
|---|---|
| **Access token** | Short-lived JWT proving who you are |
| **Aggregation pipeline** | MongoDB's multi-stage data processing (`$match`, `$group`…) |
| **Agent** | An LLM in a loop that can call tools until it has an answer |
| **Assertion** | A rule a check result must satisfy (e.g. status code equals 200) |
| **Atomic operation** | One step that can't be interrupted or interleaved |
| **bcrypt** | Slow, salted password hashing algorithm |
| **BullMQ** | Redis-backed job queue library for Node |
| **CORS / preflight** | Browser permission system for cross-origin requests / the `OPTIONS` check before them |
| **Denormalization** | Storing a value in more than one place to make reads faster |
| **Event** | An automatic record that something changed (e.g. API_DOWN) |
| **Function calling** | A model asking your code to run a named function |
| **httpOnly cookie** | Cookie JavaScript cannot read |
| **Idempotent** | Safe to run twice with the same effect |
| **Incident** | A tracked outage case with status, owner and timeline |
| **JWT** | Signed token carrying claims (id, email, tokenVersion) |
| **Middleware** | Function that runs before the route handler |
| **Multi-tenant** | Many customers share one app; their data stays separate |
| **Prompt injection** | Untrusted text trying to give the model new instructions |
| **RBAC** | Role-based access control |
| **Repeatable job** | A queue job that re-runs on a schedule |
| **SSRF** | Tricking a server into making requests to places it shouldn't |
| **TTL index** | Index that auto-deletes documents after a time |
| **tokenVersion** | Counter on the user used to revoke all issued tokens |
| **Worker** | Background process that executes queued jobs |
| **Workspace** | The tenant: a team's private area with members and data |

---

## 12. Interview questions and model answers

**How to use this section:** cover the answer, say yours out loud, then compare. Model answers are *shapes* — put them in your own words. Each answer is short on purpose; interviewers will ask follow-ups, and the guide above has the depth.

Difficulty tags: 🟢 basic · 🟡 intermediate · 🔴 advanced.

---

### A. Project overview and motivation

**A1 🟢 Tell me about this project.**
Use the pitch from section 1. Structure: *what it is* (multi-tenant API monitoring platform) → *the loop* (check on schedule, log, open incidents, alert, explain with AI) → *the stack* in one line → *what you're proudest of* (the queue pipeline and the AI agent). Keep it to about 60–90 seconds, then stop and let them pick a direction.

**A2 🟢 Why did you build this?**
Monitoring tools like UptimeRobot, Sentry and PagerDuty combine several ideas — scheduling, state machines, alerting, multi-tenancy — that are common in real backends. Building one let me practise background jobs, auth and RBAC, data modelling for time-series-like data, and integrating an LLM safely, in one coherent product instead of separate toy apps.

**A3 🟢 What was the hardest part?**
Pick one you can explain. Good options: (1) designing the check → incident → event → workflow pipeline so a failure in one step doesn't break the others; (2) making the AI agent safe (tenant-scoped tools, bounded loops); (3) the CORS preflight bug where pages silently showed no data. Describe the *problem, how you diagnosed it, and the fix.*

**A4 🟡 What would you do differently if you started again?**
Write tests alongside the code, validate request bodies with a schema library, split the worker from the API from day one, keep refresh-token handling consistent in login and register, and avoid shelling out to `ping`. (Naming real mistakes you found is a strength.)

**A5 🟡 Did you use AI tools to build this? How much do you understand?**
Be honest and confident: "Yes, I used AI assistance for parts of it. I then reviewed the code end to end, ran and debugged it, and I can walk you through any flow." Then *prove it* by explaining a flow in detail when asked (Flow C is the best one). Never claim you wrote what you can't explain.

**A6 🟡 Who would use this and what is the core value?**
Small teams who run APIs and want to know quickly when something breaks, who's handling it, and why it broke. The differentiator is the incident workflow plus AI-assisted root-cause hints instead of just "it's down".

---

### B. Node, Express and TypeScript

**B1 🟢 What is Express middleware? Give an example from your project.**
A function `(req, res, next)` that runs before the route handler. It can modify the request, end the response, or call `next()`. Example: `auth` verifies the JWT and attaches `req.user`; `checkWorkspaceRole` then loads the workspace and checks the role. A request to `/api/monitors` passes through `cors → helmet → json → rateLimit → auth → checkWorkspaceRole → controller`.

**B2 🟢 Why TypeScript?**
Compile-time type checking catches wrong fields and null mistakes early, gives autocomplete, and acts as documentation (e.g. the `Incident` and `AgentResult` interfaces). It's `strict` in this project.

**B3 🟡 Explain the controller / service / model separation.**
*Routes* map URLs to handlers and declare required roles. *Controllers* deal with HTTP (read params, status codes). *Services* hold business logic with no Express types (so the worker and the manual-check endpoint reuse the same `checkMonitor`). *Models* define data and talk to MongoDB. This keeps each layer small and testable.

**B4 🟡 How does error handling work?**
Controllers use `try/catch` and respond with a status and a `message`. There's a JSON-parse error handler for invalid bodies and a global error handler at the end. Honest improvement: wrap handlers in a shared async wrapper and return consistent error shapes, and avoid returning raw `error.message` to clients in production.

**B5 🟡 What does `async/await` do and how do you run things in parallel?**
`await` pauses a function until a promise settles without blocking the thread. For independent work I use `Promise.all` — e.g. the HTTP check and the SSL check run together in the worker, so a check takes as long as the slower one, not the sum.

**B6 🟡 What is the event loop? Why is Node good for this project?**
Node runs JavaScript on one thread but handles I/O asynchronously through the event loop. Monitoring is mostly waiting on network responses, so one process can supervise many checks at once. CPU-heavy work would be a poor fit (and would block requests).

**B7 🟡 What does `trust proxy` do and why did you set it?**
Behind Render/Nginx, the connection's IP is the proxy's. `trust proxy` makes Express read the real client IP from `X-Forwarded-For`, which the rate limiter needs to limit per client.

**B8 🟢 What's the difference between `req.params`, `req.query` and `req.body`?**
Params come from the URL path (`/monitors/:id`), query from the `?key=value` part (`?page=2`), and body from the request payload (JSON). My RBAC middleware looks for the workspace id in the header, params, body and query.

---

### C. MongoDB and Mongoose

**C1 🟢 Why MongoDB instead of SQL?**
The data is document-shaped: monitors with nested assertions, incidents with embedded timelines/comments, workspaces with embedded members. Mongo handles that without joins, has easy TTL indexes for logs, and a flexible schema while the product evolved. Trade-off: no multi-table transactions by default and weaker relational integrity; if I needed complex reporting joins, Postgres would be a fair choice.

**C2 🟡 What indexes did you create and why?**
- `Log`: compound `{monitorId, workspaceId, checkedAt:-1}` for "latest logs of this monitor", plus a TTL index on `checkedAt`.
- `Event`: the same pattern.
- `ExceptionIssue`: **unique** `{workspaceId, hash}` to guarantee one issue per fingerprint.
- `workspaceId` indexes on Monitor, Incident, Workflow, etc. for tenant-scoped queries.
Explain the rule: index what you filter and sort on.

**C3 🟡 What is a TTL index?**
An index on a date field with `expireAfterSeconds`; MongoDB's background task deletes documents once the date is older than that. I use 30 days on logs, events and exception events to bound storage with no cron job. (Deletion isn't instant — it runs about once a minute.)

**C4 🟡 Embedded vs referenced — what did you choose?**
Embedded for data that's small, owned by the parent and read together: assertions, incident timeline/comments, workspace members, and the AI analysis. Referenced (by ObjectId) for data that grows large or has its own life: logs, events, monitors, incidents (referencing the monitor).

**C5 🔴 Explain how you compute uptime.**
One aggregation: `$match` on monitor and workspace, then `$group` with `$sum` for total, `$sum`/`$cond` to count UP and DOWN, and `$avg/$min/$max` of `responseTime`. Uptime % = up / total × 100, rounded to 2 decimals. It runs in the database so I don't pull thousands of logs into Node, and I cache the result in Redis for 60 s.

**C6 🔴 How did you avoid duplicate exception issues under concurrency?**
A unique compound index on `{workspaceId, hash}` plus a single atomic `findOneAndUpdate` with `upsert: true`, `$setOnInsert` for first-seen fields and `$inc` for counters. Two requests arriving together can't both create the issue, and counters never lose updates (no read-modify-write in application code).

**C7 🟡 What is `lean()` / `populate()`?**
`populate` replaces a stored ObjectId with the referenced document (used for incident → monitor name and assignee). `lean()` returns plain JavaScript objects instead of heavy Mongoose documents — faster for read-only data, which I use in the AI tools.

**C8 🟡 What would you do if the logs collection reached hundreds of millions of documents?**
Use time-series collections or a dedicated TSDB, batch inserts, pre-aggregate hourly/daily rollups for dashboards, keep TTL, make sure queries use the compound index, and consider sharding by `workspaceId`.

---

### D. Authentication, authorization and security

**D1 🟢 How does authentication work end to end?**
Register/login → server returns a 15-minute JWT access token → the frontend sends it as `Authorization: Bearer`. A `auth` middleware verifies the signature, loads the user, and compares `tokenVersion`. A 7-day refresh token in an httpOnly cookie lets the client silently get new access tokens.

**D2 🟡 Why two tokens?**
A short-lived access token limits the damage if it's stolen; a long-lived refresh token keeps users signed in. The refresh token is httpOnly so JavaScript (and XSS) can't read it, and it's only used on the refresh endpoint.

**D3 🟡 How do you log a user out of all devices?**
Each user has `tokenVersion` stored in the DB and inside every token. `POST /auth/revoke` increments it; any token carrying the old number is rejected by the middleware and by refresh. It's instant revocation without a token blacklist.

**D4 🟡 Why check the database on every request? Isn't JWT supposed to be stateless?**
Pure statelessness can't revoke tokens. The extra lookup trades a little performance for instant revocation and "user deleted" handling. At scale I'd cache the `tokenVersion` in Redis.

**D5 🟡 How does authorization work?**
Roles are per workspace. `checkWorkspaceRole([...])` loads the workspace, verifies membership, and checks the role against the route's allowed list. Controllers then query with `workspaceId: req.workspace._id`. Roles: OWNER, ADMIN, MEMBER, VIEWER (matrix in 6.2).

**D6 🔴 How do you prevent one tenant from seeing another tenant's data?**
Three layers: (1) every document has `workspaceId`; (2) the workspace comes from a middleware that verified the user is a member; (3) every query includes that `workspaceId` as part of the filter, so passing a foreign id returns 404. The same principle applies in the AI tools: ids come from the incident, never from the model.

**D7 🟡 What is CORS and what bug did you hit?**
Browsers block cross-origin requests unless the server allows them. Custom headers trigger a preflight `OPTIONS` request. My frontend sends `x-workspace-id` on every call but my CORS allow-list didn't include it, so the browser blocked the real requests, no workspace loaded, and pages showed empty states with no error. `curl` worked because it ignores CORS. I fixed it by adding the header to `allowedHeaders`.

**D8 🟡 What security measures did you add?**
bcrypt hashing, JWT with short expiry, httpOnly cookie, `tokenVersion` revocation, Helmet headers, rate limiting, role checks, tenant-scoped queries, request size limits via `express.json`, and for the AI feature: read-only scoped tools, bounded inputs, caps and a kill switch.

**D9 🔴 What are the security weaknesses of your project?** *(answer this proactively)*
I reviewed my own code and found and fixed the serious ones: PING monitors built a shell command from user input (command injection) — now `execFile` plus strict host validation; update endpoints trusted the whole request body (mass assignment) — now field whitelists; login forgot the refresh cookie; and enabling webhooks needed an SSRF guard. What's still open: CORS reflects any origin unless `CORS_ORIGINS` is set, public error ingestion has no secret key, the login limiter is too generous, and there are no automated tests yet (section 9).

**D10 🟡 What is XSS and CSRF and how are you protected?**
XSS: attacker-supplied script runs in your page — React escapes rendered text by default (including AI output), and I don't use `dangerouslySetInnerHTML`. CSRF: a malicious site triggers requests using your cookies — the API authorises with a bearer token header (not cookies), and the only cookie (refresh) is `sameSite: lax` and only used on the refresh endpoint.

**D11 🟡 Why bcrypt and what is a salt?**
bcrypt is deliberately slow and adaptive (cost factor 10), which makes brute-forcing leaked hashes expensive. A salt is a random value mixed into each hash so identical passwords have different hashes and rainbow tables don't work; bcrypt handles salts internally.

**D12 🟢 What do the status codes 401 and 403 mean?**
401: not authenticated (no or invalid token). 403: authenticated but not allowed (wrong role or not a member).

---

### E. Queues, Redis and workers

**E1 🟢 Why did you use a queue?**
Checks are slow and periodic. Running them in the API would slow requests and lose work on restarts. BullMQ stores schedules and jobs in Redis, runs them in worker processes with retries and concurrency control, and can scale to more workers.

**E2 🟡 How is the schedule implemented?**
When a monitor is created, I add a BullMQ **repeatable job** `ping-<id>` with `repeat.every = interval × 60,000 ms`. Updating the interval removes the old repeatable job and adds a new one; deleting the monitor removes it. Workers pick the jobs up on schedule.

**E3 🟡 What happens inside one job?**
Load the monitor → run the check with retries and the SSL check in parallel → save status → write a log → update/open/resolve incidents → create events → run workflows. If anything throws, the job is rethrown so BullMQ retries it (up to 3 attempts).

**E4 🟡 Concurrency — what does `concurrency: 5` mean?**
One worker processes up to 5 jobs at the same time. Since the work is network I/O, that's safe. For the AI worker I use 1 to respect provider rate limits.

**E5 🔴 What are the problems with sleeping during retries?**
`checkMonitorWithRetries` waits `retryInterval` seconds between attempts *inside* the job, so a failing monitor can hold a worker slot for minutes (up to 5 retries × 60 s). With 5 slots, a few broken monitors can delay the rest. Better: make each retry its own delayed job, so no slot is held while waiting.

**E6 🔴 What if Redis restarts or loses data?**
Repeatable-job schedules live in Redis. With persistence on they survive a restart. If Redis is wiped, `syncMonitorJobs()` runs at startup and re-creates schedules for any monitor missing one (it only adds, never removes, and is idempotent). The `/healthz` endpoint reports Redis status, and the analytics cache simply recomputes.

**E7 🟡 How do you avoid duplicate checks if there are multiple workers?**
BullMQ guarantees a job is delivered to one worker at a time (it locks the job). Repeatable jobs are keyed by name + options, so adding the same one twice doesn't duplicate the schedule. The incident lifecycle also checks for an existing active incident, so a duplicate check can't create a duplicate incident.

**E8 🟡 What else do you use Redis for?**
Caching monitor analytics for 60 seconds and the health check. (The rate limiter currently uses memory; the Redis store package is installed but not wired up.)

**E9 🟡 What's the difference between a queue, a cron job and `setInterval`?**
`setInterval` lives in one process's memory — lost on restart and runs once per instance. Cron triggers a command on a machine but gives no retries or tracking. A queue is durable, observable, retryable, and works across many workers.

---

### F. Monitoring logic

**F1 🟢 What kinds of checks do you support?**
HTTP (status code 200–399 = UP, 10 s timeout), TCP (socket connect, 5 s), DNS (resolve a record type), and PING (OS `ping`). Plus an SSL certificate check for HTTPS URLs.

**F2 🟡 What are assertions?**
Rules beyond "reachable": status code, response time, body text, or a JSON path, with operators like EQUALS/CONTAINS/GREATER_THAN. All must pass for UP. They only make a monitor stricter — a network failure stays DOWN even if assertions pass.

**F3 🟡 Why retries before marking DOWN?**
A single failed request can be a network blip. Retrying a few times with a short delay avoids false alarms and alert fatigue.

**F4 🟡 How does the SSL check work?**
Open a TLS socket to host:443, read the peer certificate, compute days until `valid_to`, and flag expired/invalid. `rejectUnauthorized: false` is intentional so it can inspect bad certificates instead of failing. Runs in parallel with the main check.

**F5 🟡 Why are redirects not followed in the HTTP check?**
`maxRedirects: 0` so a 301/302 is reported as-is (and counted as UP since it's under 400), rather than silently following to another URL. A monitor can add a status-code assertion for strictness.

**F6 🔴 What's SSRF and does your monitor have it?**
Server-Side Request Forgery: making the server request something it shouldn't, like `http://169.254.169.254` (cloud metadata) or internal services. A monitoring tool *by nature* fetches user-supplied URLs, so yes it's exposed. For a hosted multi-tenant version I'd block private/loopback ranges after DNS resolution and restrict redirects.

---

### G. Events, workflows and incidents

**G1 🟢 What's the difference between an event, a workflow and an incident?**
*Event:* an automatic signal like API_DOWN. *Workflow:* a rule "on this event, run these actions" (e.g. email). *Incident:* a tracked case with status, assignee and timeline for humans to manage.

**G2 🟡 How do you avoid creating many incidents during one outage?**
Incidents are created only on the transition into DOWN, and only if there isn't already an active (TRIGGERED/ACKNOWLEDGED) incident for that monitor.

**G3 🟡 Explain the incident states.**
TRIGGERED → ACKNOWLEDGED (someone takes it) → RESOLVED (manually, or automatically on recovery). Each change adds a timeline entry with who did it.

**G4 🟡 What happens if an email action fails?**
It's caught; a `WorkflowExecution` is stored with status FAILED and the error message. The worker keeps going and the incident is unaffected. You can see failures in the executions list.

**G5 🟡 Which workflow actions work?**
All four: email, webhook, Slack and Teams. Each has per-type validation (valid http(s) URLs, header checks) and unknown config keys are stripped. The outbound senders have an SSRF guard (private/internal targets blocked, checked at connect time, no redirects, 10 s timeout). I verified webhook/Slack/Teams payloads against a local listener; email needs real SMTP settings.

**G6 🟡 How do you test a workflow without causing an outage?**
`POST /workflows/:id/test` runs it immediately with a fake event.

---

### H. Error tracking (mini-Sentry)

**H1 🟡 How do you group duplicate errors?**
I compute a SHA-256 fingerprint from the error type, the message with numbers replaced by `{num}`, and the top two stack frames with line/column numbers and domains stripped. Identical bugs from different users and builds produce the same hash and land in one issue with a counter.

**H2 🟡 How does the client SDK send errors?**
A small script served at `/api/errors/sdk.js`. It listens for `window.error` and `unhandledrejection`, then sends a JSON payload with `navigator.sendBeacon` (works even while the page unloads), falling back to `fetch`.

**H3 🔴 Why one atomic `findOneAndUpdate` with upsert?**
Two identical errors can arrive at the same time. A "find then insert" would race and create duplicates. The single upsert plus a unique index on `{workspaceId, hash}` makes create-or-increment atomic.

**H4 🟡 What's the weakness of the public ingest endpoint?**
It needs no login and is keyed only by `workspaceId`, which isn't secret. Anyone with the id can submit junk. Real systems use a secret key (DSN) per project and rate-limit by it.

---

### I. The AI feature

**I1 🟢 What does the AI feature do?**
When an incident opens (or when a user clicks Analyze), an agent investigates with five read-only tools — recent logs, SSL status, related exceptions, other monitors' status, DNS lookup — and returns a structured diagnosis: probable cause, confidence, evidence and next steps, shown on the incident page.

**I2 🟡 What is an agent / function calling? Explain your loop.**
Function calling lets the model reply "call tool X with these args" instead of text. My loop keeps the conversation history, sends it to Gemini, runs any requested tools in my own code, appends the results as a user turn, and repeats until the model returns a final JSON answer — capped at 6 rounds.

**I3 🔴 How do you make sure the AI can't leak another tenant's data?**
The model never supplies ids. `workspaceId`, `monitorId` and the incident time come from the incident record in the database (`ToolContext`), and every tool query includes them. The only model-controlled values are small numbers (`limit`, `windowMinutes`) which I clamp. `dns_lookup` takes no arguments at all.

**I4 🔴 What is prompt injection and how did you handle it?**
Attackers can plant text in places the agent reads — an error message or log line saying "ignore your instructions…". Defenses: the system prompt says tool output is untrusted data and must never be followed; tools are read-only so a hijacked model can't change anything; outputs are parsed and validated into a fixed JSON shape; strings are truncated; and the UI renders text without HTML. The worst case is a misleading diagnosis text, not a data breach.

**I5 🟡 Why a queue for AI analysis?**
LLM calls take many seconds and can fail or be rate-limited. A background job keeps the incident flow fast, lets me limit concurrency to 1 and retry safely, and returns `202` immediately while the UI polls.

**I6 🟡 What happens when Gemini is down or the quota is exhausted?**
`withRetry` retries 429/500/503 with backoff and honors the provider's "retry in N seconds" hint. A per-day quota error fails fast. Any failure is saved as `analysis.status = FAILED` with a friendly message; incidents, checks and workflows are unaffected.

**I7 🟡 How do you control cost and abuse?**
A master switch (off by default), a per-incident claim lock so you can't queue twice, a 30-second cooldown for re-runs, a per-workspace daily cap, a 6-round tool limit, concurrency 1, and `temperature 0.2` with a bounded output.

**I8 🔴 How do you know the AI is right? Did you evaluate it?**
`npm run ai:eval` runs the agent on four seeded incidents with known causes (database outage, expired SSL, DNS failure, intermittent 503s) and checks that the diagnosis mentions the right cause and that the right tool was used. Two of four were verified before the free-tier daily quota ran out; I rerun it for the full score. I'd extend it with more scenarios and track pass rate across prompt changes. I also show the evidence and tool calls so a human can verify the claim.

**I9 🟡 Why did you manage the conversation history yourself instead of using the SDK's chat?**
The SDK's `startChat` labelled tool results with role `function`, which the newer Gemini API rejects (HTTP 400). Managing `contents` myself and sending tool results as a `user` turn fixed it, and made the loop explicit and easier to reason about.

**I10 🟡 Why Gemini? Could you switch providers?**
It had a free tier and function calling. The provider is isolated in `llm.service.ts` and the agent file, so swapping to another provider means changing those two files; tools, queue and UI stay the same.

**I11 🟡 How does the feature switch work?**
`AI_ANALYSIS_ENABLED=true` (exact string) in the backend env. When off: the analyze endpoint returns 403, the worker doesn't start, no automatic analysis runs, stored `analysis` is removed from every incident response, and the frontend hides the panel because `GET /api/features` returns `false`. It defaults to off so it can't run (or spend quota) by accident.

**I12 🟡 What are the limits of this AI approach?**
It can only reason about data the tools expose; it can be confidently wrong; free-tier quotas limit usage; the model can be slow or overloaded. So the UI shows confidence and evidence, labels it AI-generated, and never takes actions automatically — it only suggests.

**I13 🔴 How would you improve the agent?**
Add more tools (deploy history, recent changes, metrics), have it write results into the incident timeline, stream partial progress to the UI, build a bigger eval set with automated scoring, cache analyses for near-identical incidents, and add human feedback ("was this helpful?") to measure quality.

---

### J. Frontend and React

**J1 🟢 How is the frontend structured?**
Vite + React + TypeScript. Pages under `pages/`, shared UI in `components/ui`, two Contexts (`AuthContext`, `WorkspaceContext`), and one API wrapper `lib/api.ts` with a typed function per endpoint.

**J2 🟡 Why Context instead of Redux?**
State is small: who's logged in and which workspace is active. Context avoids extra libraries. If server data (caching, refetching, loading states) grew more complex, I'd add React Query.

**J3 🟡 How are protected routes done?**
`ProtectedRoute` checks for a token and redirects to `/login` if missing; all app routes are nested inside it with the `AppLayout`.

**J4 🟡 How does the app handle an expired token?**
The `request` wrapper catches `401`, calls `/auth/refresh` (cookie), saves the new token and retries the original request once; if refresh fails it clears storage and redirects to login.

**J5 🟡 Why did monitors not load when the CORS header was missing? Explain the dependency.**
Pages wait for both a token and an `activeWorkspaceId` before fetching. The workspace list request was blocked by CORS, so there was no active workspace, so pages never fetched and just showed empty states. A takeaway: surface fetch errors in the UI instead of silently showing "no data".

**J6 🟡 What does `useEffect` with `[token, activeWorkspaceId]` do?**
It re-runs the load function whenever the token or the active workspace changes, so switching workspaces automatically reloads data.

**J7 🟡 How does the incident page poll while the AI is running?**
A `useEffect` watches `analysis.status`. While it's `PENDING` it sets a 3-second `setInterval` to refetch the incident, and clears the interval (cleanup function) when the status changes or the component unmounts.

**J8 🟡 What's `localStorage` used for and what are the risks?**
It stores the access token, user profile and active workspace id so refreshes keep you logged in. Risk: any XSS can read it. Mitigated by a 15-minute token lifetime and React's output escaping; an in-memory token would be stricter.

**J9 🟡 How would you make the UI better for accessibility and performance?**
Semantic elements, ARIA labels (the AI panel has `aria-label`, `role="status"`), keyboard navigation, code-splitting routes with lazy loading, and memoizing heavy lists. Server-side pagination instead of client-side for big monitor lists.

---

### K. DevOps and deployment

**K1 🟢 How is it deployed?**
Backend on Render, Redis on Upstash (TLS via `rediss://`), MongoDB hosted (confirm which provider you used), frontend built by Vite. Locally you can run everything with `docker-compose` (Mongo, Redis, backend, nginx-served frontend).

**K2 🟡 What does the Dockerfile do?**
Multi-stage: the first stage installs everything and compiles TypeScript; the second stage installs only production dependencies and copies the compiled `dist`, giving a smaller, safer image. It runs `node dist/server.js`.

**K3 🟡 How do you handle configuration and secrets?**
Environment variables loaded with dotenv; `.env` is git-ignored and `.env.example` documents the keys with empty values. Secrets in the compose file are placeholders and must be overridden.

**K4 🟡 What's the health endpoint for?**
`/healthz` reports MongoDB and Redis status and returns 503 if unhealthy, so platforms/load balancers (and I) can detect problems.

**K5 🟡 How would you add CI/CD?**
A GitHub Actions workflow that on every push/PR runs `npm ci`, type-checks/builds backend and frontend, and runs tests; then deploy on merge to `main`. Add a status badge to the README.

**K6 🟡 How do you debug production problems?**
Winston logs (JSON, with timestamps), the health endpoint, and checking queue state in Redis. Improvements: request ids in logs, metrics (queue depth, failure rate), and error tracking for the backend itself.

---

### L. System design and scaling

**L1 🔴 How would you scale to 100,000 monitors?**
Give the numbered outline from section 10.1: separate workers and scale horizontally; avoid sleeping in jobs; add jitter to spread load; time-series storage with rollups for logs; read replicas / sharding by workspace; keep Redis caching; multi-region checks; metrics and alerts; reconcile schedules on boot.

**L2 🔴 What is the single point of failure?**
Redis (schedules and queue) and the single API+worker process. Mitigations: managed Redis with persistence/replicas, separate worker processes with health checks, multiple API instances behind a load balancer.

**L3 🔴 How would you reduce false positives?**
Retries (already), checks from multiple regions with quorum ("DOWN only if 2 of 3 regions fail"), per-monitor thresholds ("N consecutive failures"), and maintenance windows.

**L4 🔴 How would you design status pages or push (heartbeat) monitoring on top of this?**
Heartbeat: give each monitor a secret URL; the customer's job pings it on schedule; a periodic worker flips the monitor DOWN if no ping arrives within the grace period. Status page: a public, cached, read-only endpoint exposing selected monitors' status/incidents, with its own rate limit.

**L5 🔴 How would you make alerting smarter and less noisy?**
Deduplicate SLOW_RESPONSE events with cooldowns, group related incidents (same root cause), escalation policies (notify on-call, then the manager after N minutes), and severity based on impact.

---

### M. Debugging and behavioural

**M1 🟢 Tell me about a bug you fixed.**
Use the CORS story. *Symptom:* pages showed empty tables though the API returned data via curl. *Investigation:* checked config, database, API directly, localStorage, then replayed the browser's preflight request and saw `x-workspace-id` missing from `Access-Control-Allow-Headers`. *Fix:* added the header. *Lesson:* test with a browser-faithful request, and show errors in the UI.

**M2 🟡 Another bug story?**
The Gemini integration: the model correctly asked for tools but the follow-up call returned 400 "Role 'function' is not supported". I found that the SDK's chat helper sends a role the new API rejects, switched to managing the conversation history manually, and added fail-fast handling for the free-tier daily quota.

**M3 🟡 How do you test your code?**
Be honest: I verified behaviour by running the real flows (APIs, seeded data, an eval script for the AI) and type-checking; automated unit/integration tests and CI are the next step. Then name what you'd test first: assertion engine, `parseAnalysis`, tool scoping, incident lifecycle, RBAC.

**M4 🟡 How do you decide what to build next?**
By risk and value: fix correctness/security issues first, then reliability (tests, worker split), then features that improve the demo and user value (charts, live updates).

**M5 🟢 What did you learn?**
Pick three: designing background pipelines; tenant isolation thinking; safe LLM integration (tools, bounded loops, injection); and how browsers enforce CORS.

**M6 🟡 What would you add with one more week?**
Fix login cookie and ping injection, add tests + CI, enable Slack/webhook actions, charts with live updates.

---

### N. Trap and "gotcha" questions

These are questions where interviewers probe weaknesses. Answer calmly, directly and with the fix.

**N1 🔴 "A user says they're logged out after 15 minutes. Why?"**
That was a real bug I found: `login` didn't set the refresh cookie (only `register` did), so the silent refresh failed once the 15-minute access token expired. I fixed it by setting the cookie in `loginUser` and centralising the cookie options so set and clear always match, and verified login → refresh → logout against a running server.

**N2 🔴 "Could someone run commands on your server?"**
It was possible in the first version: the host was interpolated into an `exec` shell command and URL parsing leaves characters like `;` intact. I fixed it with `execFile` (argument list, no shell) plus strict hostname/IP validation, and also reject bad targets when a monitor is created or edited. I tested seven injection payloads and confirmed nothing ran.

**N3 🔴 "Can a member move a monitor to another workspace?"**
Not any more. That was mass assignment: updates passed the raw body to the database. Now only whitelisted fields (name, url, interval, ...) are applied via `$set`, and I tested that `workspaceId`/`status` in the body are ignored and the monitor never appears in another tenant's workspace.

**N4 🔴 "Your Slack integration — does it work?"**
Yes — it's enabled now. It was implemented but blocked by validation (only EMAIL was allowed). I enabled all four channels with validation and an SSRF guard, and tested delivery against a local listener. Real Slack/Teams endpoints I haven't hit, so I'd say that honestly.

**N5 🔴 "Your dashboard shows SSL expiring soon = 0. Is that real?"**
It is real now. It used to be a hard-coded placeholder; the card now counts HTTPS monitors whose certificate is expired or expires within 14 days, using the SSL data the backend already stores per monitor.

**N6 🔴 "What happens if the monitor you're checking returns 301?"**
Redirects aren't followed (`maxRedirects: 0`), and a 3xx counts as UP (status < 400). To be strict, add a status-code assertion.

**N7 🔴 "Why not just use `setInterval` and skip Redis?"**
It runs inside one process, is lost on restart, can't retry or scale across workers, and blocks the API's resources. A durable queue solves those.

**N8 🔴 "If two workers pick the same monitor, will you get two incidents?"**
No: BullMQ delivers each job to one worker, and even if two checks ran, the incident code only creates one when no active incident exists. (A fully race-free version would use a unique partial index or an atomic upsert.)

---

## 13. Cheat sheet and study plan

### 13.1 One-page revision sheet

**Pitch:** multi-tenant API monitoring + incidents + alerts + error tracking + AI root-cause analysis.

**Stack:** Node 20, Express 5, TypeScript, MongoDB/Mongoose, BullMQ + Redis, JWT + bcrypt, Winston, Nodemailer, Gemini; React 18 + Vite + Tailwind.

**Pipeline (say it from memory):**
`create monitor → repeatable BullMQ job → worker: check (+retries, assertions) ‖ SSL → update monitor → Log → incident lifecycle → events → workflows (email) → (AI analysis job)`

**Auth:** 15-min access JWT, 7-day httpOnly refresh cookie, `tokenVersion` revocation, `auth` middleware hits DB.

**Tenant safety:** `workspaceId` on every doc; `checkWorkspaceRole` verifies membership; controllers filter by `req.workspace._id`.

**Roles:** OWNER, ADMIN, MEMBER, VIEWER (viewers read-only; only OWNER/ADMIN manage members).

**Data hygiene:** TTL 30 days on logs, events, exception events. Analytics cached in Redis 60 s.

**AI:** guard (`requestAnalysis`) → queue → worker (concurrency 1) → agent loop (≤6 rounds) → 5 read-only tools → validated JSON → `Incident.analysis`. Safe because ids come from the DB, inputs are clamped, tools are read-only, prompt treats output as data, caps + kill switch (`AI_ANALYSIS_ENABLED`, default off).

**Numbers:** 15 min · 7 days · 1000 req/15 min · 30 days · concurrency 5 and 1 · 60 s cache · 6 rounds · 30/day AI cap · 10 s HTTP timeout · 5 s TCP/SSL timeout · SLOW > 1000 ms.

**Know your weak spots (say them first):**
1. ✅ Fixed — PING command injection (`exec` → `execFile` + validation). Know the story.
2. ✅ Fixed — login now sets the refresh cookie
3. ✅ Fixed — update fields whitelisted
4. CORS reflects any origin unless `CORS_ORIGINS` is set (opt-in allowlist)
5. ✅ Fixed — all four alert channels enabled (email verified via code path; others against a local listener)
6. No automated tests/CI; worker inside the API process; retries sleep in-job; public error ingestion has no secret key

### 13.2 Seven-day plan

| Day | Focus | Output |
|---|---|---|
| 1 | Read sections 1–4. Run the app locally, seed data, click every page. | You can draw the architecture from memory. |
| 2 | Sections 5–6.1–6.5. Open the files; follow auth and a monitor check in the code (add `console.log` or use the debugger). | Explain auth + RBAC + a check cycle aloud. |
| 3 | Sections 6.6–6.9. Trigger an outage (point a monitor at a dead URL), watch the incident/event/workflow. Send a test exception. | Explain Flow C and Flow D. |
| 4 | Section 6.10 (AI) + `incident.agent.ts`, `ai.tools.ts`. Run `npm run ai:eval` (after quota resets). | Explain the agent loop and the safety design. |
| 5 | Sections 9–10. Read the git history of the security fixes (`git log`) and explain each commit; write one automated test for it. | A real fix you can talk about, with a test. |
| 6 | Section 12, questions A–I out loud (record yourself). | Fluent answers, no reading. |
| 7 | Questions J–N, then a full mock: 5-minute demo + 15 questions with a friend. | Interview ready. |

### 13.3 Questions to ask the interviewer (shows maturity)
- "How does your team handle on-call and alert fatigue?"
- "What does your testing and CI setup look like?"
- "How do you decide between building a feature in-house vs using a managed service?"

---

*End of guide. Good luck — and when you hit something here that doesn't match the code you remember, trust the code and update this document.*
