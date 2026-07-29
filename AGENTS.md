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

## Feature Upgrades Roadmap (DevFlow OS 20-Phase Master Plan)

- [x] **Phase 1 - Authentication & Foundation**: JWT auth, profile, logging, token verification. (Completed)
- [x] **Phase 2 - Workspaces & RBAC**: Multi-tenant workspaces, invitations, permissions (Owner, Admin, Member, Viewer). (Completed)
- [x] **Phase 3 - Monitoring Engine**: HTTP/HTTPS checks, interval polling, latency signals, SSL expiration tracking. (Completed)
- [x] **Phase 4 - Distributed Workers**: BullMQ + Redis task queues for background checker isolation. (Completed)
- [x] **Phase 5 - Workflow Automation**: Event dispatcher (UP/DOWN/SLOW) and actions (Email, Webhook, Slack, Teams). (Completed)
- [ ] **Phase 6 - Dashboard & Analytics**: Uptime %, response graphs, and live Socket.io updates.
- [x] **Phase 7 - Incident Management**: PagerDuty-style severe incidents, assignees, acknowledging, and timeline details. (Completed)
- [ ] **Phase 8 - Advanced Monitoring**: TCP, Ping, DNS checks, and assertions (JSONPath/Status Code assertions).
- [ ] **Phase 9 - Visual Workflow Builder**: Drag-and-drop React Flow visual graph canvas.
- [/] **Phase 10 - Logs & Observability (Mini-Sentry)**: Exception ingestion endpoint & SDK tracker, issue grouping, and search search/filters. (In Progress)
- [ ] **Phase 11 - Distributed Architecture**: Worker registration, heartbeats, autoscaling, and worker dashboard.
- [ ] **Phase 12 - Synthetic Monitoring**: Step assertions, cookie tracking, and variable reuse (like Postman).
- [ ] **Phase 13 - Browser Monitoring**: Playwright headless browser E2E flows, form filling, and crash screenshots.
- [ ] **Phase 14 - Public Status Pages**: Guest status urls with email/webhook subscription options.
- [ ] **Phase 15 - Secret Manager**: Vault-like encrypted at rest configuration store for credentials.
- [ ] **Phase 16 - Plugin SDK**: Hot reloading plugin loaders and marketplace.
- [ ] **Phase 17 - AI Assistant**: Root cause diagnosis, logs chat, and automated fix recommendations.
- [ ] **Phase 18 - Enterprise Features**: Audit logs, SSO (SAML), rate limiting, and whitelisting.
- [ ] **Phase 19 - DevOps Integrations**: Exporters for Grafana, CloudWatch, and CI/CD triggers.
- [ ] **Phase 20 - Production Ready**: Kubernetes configs, load testing, and self-hosted docker deployment documentation.

### Extras:
- Google Login / OAuth
- OTP Login
- Logout from all devices
- Profile editing & customization