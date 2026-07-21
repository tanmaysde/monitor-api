# API Monitor Project Notes

## Project Goal

Build an API Monitoring + Logs + Automation system inspired by n8n.

## Phase Progress

- Phase 1: Complete
- Phase 2: Complete
- Phase 3: Complete
- Phase 4: Complete
- Phase 5: Complete
- Phase 6: Complete
- Phase 7: Complete
- Phase 8: Complete
- Phase 9: Complete

## Phase 1: Backend Foundation

Completed:

- Express + TypeScript backend
- MongoDB connection
- User register/login
- JWT auth middleware
- Bearer token support
- Monitor CRUD
- Protected monitor routes
- Monitor validation
- Tested auth and monitor APIs

## Phase 2: Monitoring Engine

Completed:

- Monitor checker service
- Manual check endpoint: POST /api/monitors/:id/check
- Latest monitor status fields:
  - status
  - lastCheckedAt
  - lastResponseTime

## Phase 3: Logging System

Completed:

- Create Log model
- Save every monitor check result
- Add API to fetch logs for a monitor

## Phase 4: Analytics Layer

Completed:

- Calculate uptime percentage from logs
- Calculate average response time from logs
- Calculate failure count from logs
- Add analytics API for a monitor

## Phase 5: Event System

Completed:

- Define event triggers (e.g., monitor goes down/up)
- Event dispatching mechanism

## Phase 6: Workflow Engine

Completed:

- Basic workflow models and logic
- Ability to tie events to workflows

## Phase 7: Actions System

In progress:

- Workflow schema already supports `actions[]`
- Workflow execution records already store matched actions
- Events already trigger workflow execution lookup
- Email action execution is implemented and wired into workflow execution
- Manual workflow test endpoint is available: `POST /api/workflows/:id/test`
- Workflow execution failures are logged correctly
- SMTP configuration is still pending for successful email delivery
- Webhook and Slack actions are intentionally deferred for later

Still pending:

- Finish SMTP setup and verify successful email delivery
- Clean up any old invalid workflow documents in the database
- Add Webhook action later if needed
- Add Slack action later if needed
- Test final email flow in Postman

## Remaining Roadmap

- Phase 7: Finish SMTP-backed email delivery and final cleanup (Completed)
- Phase 8: Finish frontend dashboard integration and testing (Completed)
- Phase 9: Production upgrades (Completed)

## Working Rules

- Do one phase at a time.
- Do not jump to frontend before backend phases are stable.
- Prefer learning and explanation before automatic coding.
- Test each API in Postman before moving ahead.
- Track progress against this file after each milestone.

## Feature Upgrades Roadmap

### 1. AI Integrations (The Generative AI Layer)
- [ ] **AI-Powered Root Cause Analysis (RCA)**: Add an "Analyze with AI" button on failed check logs. The backend sends failure status/headers to Google Gemini API to return a formatted Markdown diagnosis and fix guide.
- [ ] **Natural Language Workflow Builder (Text-to-JSON)**: Allow users to write prompts like *"Email dev@company.com if Auth API goes down"* and use Gemini to parse it into valid workflow JSON schema.
- [ ] **Daily AI Incident Summary Emails**: A daily cron job that synthesizes 24-hour incident logs using Gemini and emails an executive status report.

### 2. Core Enterprise SaaS Features
- [ ] **Multi-Tenant Workspaces & Role-Based Access Control (RBAC)**: Team workspaces, member invitations, and permissions (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).
- [ ] **Additional Alert Channels (Slack & Discord Webhooks)**: Send rich alert messages directly to Slack channels or Discord webhooks when an API goes down.
- [ ] **Automated Weekly PDF Reports**: Generate weekly PDF uptime reports and email them as attachments.

### 3. High-Performance Infrastructure
- [ ] **Distributed Worker Queue (BullMQ + Redis)**: Replace in-app `node-cron` with a distributed Redis queue to isolate ping jobs into dedicated background worker processes.
- [x] **SSL/TLS Certificate Expiry Checker**: Read SSL certificate expiration dates via Node `tls` module and alert users 7/14/30 days before expiration. (Completed)
- [ ] **Multi-Region Monitoring (Edge Workers)**: Check APIs from global regions (US, Europe, Asia) using serverless edge handlers.

### 4. Interactive Frontend & Real-Time UX
- [ ] **Live Dashboard Updates (WebSockets / Socket.io)**: Establish persistent WebSockets to push status badge updates to the React client in real time.
- [ ] **Public Status Pages**: Generate read-only, guest-accessible status pages (`/status/:id`) for public systems without authentication.
- [ ] **Historical Log Exporter (CSV/JSON)**: Download button on check history to export logs in CSV format.

