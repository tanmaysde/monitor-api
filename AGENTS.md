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
- Phase 7: In progress
- Phase 8: In progress
- Phase 9: Not started

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

- Phase 7: Finish SMTP-backed email delivery and final cleanup
- Phase 8: Finish frontend dashboard integration and testing
- Phase 9: Production upgrades

## Working Rules

- Do one phase at a time.
- Do not jump to frontend before backend phases are stable.
- Prefer learning and explanation before automatic coding.
- Test each API in Postman before moving ahead.
- Track progress against this file after each milestone.
