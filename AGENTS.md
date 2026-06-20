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
- Phase 8: Not started
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
- Placeholder files created for action handlers:
  - `Action.ts`
  - `ActionFactory.ts`
  - `EmailAction.ts`
  - `WebhookAction.ts`

Still pending:

- Implement concrete action handlers
- Add action type definitions and validation
- Execute actions from the workflow engine instead of only logging matched workflows
- Add support for Email, Slack, and Webhook actions
- Test action flows in Postman

## Remaining Roadmap

- Phase 7: Finish action handler implementation and execution
- Phase 8: Frontend dashboard
- Phase 9: Production upgrades

## Working Rules

- Do one phase at a time.
- Do not jump to frontend before backend phases are stable.
- Prefer learning and explanation before automatic coding.
- Test each API in Postman before moving ahead.
- Track progress against this file after each milestone.
