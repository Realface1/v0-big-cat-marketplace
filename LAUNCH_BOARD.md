# BigCat Marketplace Launch Board (2-Week Execution Plan)

Last updated: 2026-04-20
Launch owner: Product + Engineering
Target: Public launch with controlled risk and measurable reliability

## 1) Launch Goals and Exit Criteria

### Goals
- Launch a stable, secure marketplace for buyers and merchants.
- Ensure escrow, order lifecycle, and sales metrics stay consistent.
- Give support and operations a clear incident and rollback path.

### Public Launch Exit Criteria (must all pass)
- P0 bugs open: 0
- P1 bugs open: <= 3 with agreed workarounds
- Buyer and merchant critical path success rate: >= 98% across smoke and UAT runs
- Payment/escrow reconciliation mismatch: 0 unresolved
- 24h error budget: API 5xx rate < 1%, auth failure rate < 2%
- Monitoring, alerting, and on-call rotation active
- Rollback drill completed successfully in staging or production-like environment

## 2) Workstream Owners

- Product owner: scope freeze, launch comms, UAT sign-off
- Engineering lead: code freeze, quality gate, release decisions
- Backend owner: DB migrations, webhook/payment consistency, reconciliation
- Frontend owner: critical UX flows and notification UX sign-off
- DevOps owner: environment parity, deploy controls, rollback path
- Support owner: runbooks, triage templates, SLA

Use real names for each owner before Day 1.

## 3) Priority Backlog (P0/P1/P2)

## P0 (must complete before launch)

1. Migration integrity and schema parity
- Owner: Backend
- Due: Day 2
- Tasks:
  - Verify all required migrations are applied in production in order.
  - Confirm constraints/indexes for orders, messages, and merchant specialization.
  - Capture a migration verification log.
- Done when:
  - Production schema diff against expected is empty.
  - No migration errors in logs.

2. Auth/session hardening
- Owner: Backend
- Due: Day 3
- Tasks:
  - Validate session expiry and refresh behavior.
  - Add or verify rate limits on login/auth routes.
  - Audit privileged route guards and role checks.
- Done when:
  - Unauthorized access tests fail as expected.
  - Auth alerts and dashboards visible.

3. Escrow and sales metrics consistency gate
- Owner: Backend + Product analytics
- Due: Day 4
- Tasks:
  - Reconcile order totals, payment status, escrow status, merchant sales aggregates.
  - Add daily reconciliation report with mismatch alert.
- Done when:
  - 3 consecutive runs show no unresolved mismatch.

4. Critical-path smoke automation
- Owner: QA + Engineering
- Due: Day 5
- Tasks:
  - Automate end-to-end checks for:
    - buyer signup/login
    - merchant signup/login and onboarding
    - add-to-cart to checkout
    - order status transitions
    - notification detail/action behavior
- Done when:
  - Green pass in CI on main branch.

5. Observability and alerting baseline
- Owner: DevOps
- Due: Day 5
- Tasks:
  - Enable frontend and API error tracking.
  - Configure uptime checks for critical APIs.
  - Configure alert routes to on-call contacts.
- Done when:
  - Synthetic alert test reaches on-call and is acknowledged.

## P1 (complete by launch week)

1. Support readiness pack
- Owner: Support
- Due: Day 7
- Tasks:
  - Build triage SOP for login, payment, order, and messaging issues.
  - Prepare customer-facing templates for outage and delay updates.
- Done when:
  - Support dry-run completes under SLA target.

2. Performance and resilience checks
- Owner: DevOps + Engineering
- Due: Day 8
- Tasks:
  - Run load test for login, product browse, checkout initiation.
  - Document limits and mitigation steps.
- Done when:
  - No P0/P1 regressions under expected launch load.

3. Compliance and policy publication
- Owner: Product + Legal
- Due: Day 9
- Tasks:
  - Publish privacy policy, terms, refunds/dispute policy.
  - Ensure links are visible in app footer and onboarding where needed.
- Done when:
  - Policy links live and reviewed.

## P2 (post-launch hardening)

1. Notification architecture uplift
- Owner: Frontend + Backend
- Due: +14 days after launch
- Tasks:
  - Move from local-only notification state to server-backed notification delivery.
  - Add push/email channels where required.
- Done when:
  - Notifications persist across devices/sessions with delivery tracing.

2. Growth analytics dashboard
- Owner: Product analytics
- Due: +14 days
- Tasks:
  - Add funnel dashboards from signup to first completed order.
- Done when:
  - Daily conversion report used in ops review.

## 4) Two-Week Delivery Plan

## Week 1 (stabilize)
- Day 1: Scope freeze, owner assignment, launch gate kickoff
- Day 2: Migration and schema verification complete
- Day 3: Auth hardening complete
- Day 4: Escrow/metrics reconciliation gate green
- Day 5: Smoke automation and alerts green

## Week 2 (dress rehearsal and launch)
- Day 6: Closed beta window starts
- Day 7: Support runbooks and SOP drill
- Day 8: Load/resilience test and fixes
- Day 9: Final UAT sign-off, legal/policy sign-off
- Day 10: Go/No-Go meeting
- Day 11: Public launch (morning)
- Day 12-14: Daily incident review and hotfix window

## 5) Go/No-Go Checklist (Launch Day)

- Code freeze active except approved hotfixes
- Release candidate tag created
- All P0 complete; P1 risks accepted by Product + Engineering
- Smoke tests passed on production
- Monitoring dashboards and alerts verified live
- On-call contacts active and reachable
- Rollback command/runbook validated
- Support team online with prepared macros/templates

If any mandatory item fails, launch is NO-GO.

## 6) Rollback Plan

Trigger rollback if any of the below happen in first 2 hours:
- Checkout completion rate drops > 30% from baseline
- API 5xx spikes > 3% for 10+ minutes
- Payment/escrow mismatch appears and cannot be auto-resolved
- Auth failures > 5% and rising

Rollback steps:
1. Announce incident in internal channel and freeze deploys.
2. Revert to previous known-good deployment.
3. Verify auth, checkout, and order APIs.
4. Post customer status update.
5. Open incident review and assign corrective actions.

## 7) Metrics to Watch (first 72 hours)

- Auth success rate
- Checkout initiation to completion conversion
- Payment failure rate by method
- Order status progression latency
- Unread message growth and notification open-to-action rate
- Support ticket volume and first-response SLA

## 8) Daily Launch Command Center Cadence (first 7 days)

- 09:00: KPI and incident review (15 min)
- 13:00: Midday health check (10 min)
- 18:00: End-of-day summary and next-day actions (15 min)

Track every action in one shared launch log.

## 9) Immediate Actions (Today)

1. Assign named owners to each P0 item.
2. Confirm migration status in production and record evidence.
3. Turn on alerting for auth, checkout, and payments.
4. Run one full buyer and one full merchant UAT path in production-like conditions.
5. Schedule Go/No-Go meeting now (calendar invite with gate checklist).
