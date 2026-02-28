# Launch Checklist

## Legal and licensing
- [ ] Confirm Tailwind Plus/Catalyst UI commercial license is valid for this deployment.
- [ ] Finalize DPA and no-training-on-customer-data language.

## Security
- [ ] Enable managed KMS-backed encryption for DB/object storage.
- [ ] Enable TLS-only ingress and service-to-service encryption.
- [ ] Validate RLS policies in staging using cross-tenant test suite.
- [ ] Configure retention and workspace deletion workflows.

## Product quality
- [ ] Capture visual baseline snapshots for landing + core app screens.
- [ ] Run trust copy lint and resolve all policy violations.
- [ ] Validate low-confidence export gating with approver role.
- [ ] Verify spreadsheet export fidelity on pilot customer templates.

## Operations
- [ ] Configure Redis and worker concurrency limits.
- [ ] Configure database backups and restore drill.
- [ ] Set alerting for queue failures and export job retries.

## Pilot readiness
- [ ] Capture baseline questionnaire turnaround metrics.
- [ ] Instrument and validate 90-day success metrics dashboard.
- [ ] Complete first five pilot onboarding sessions with real artifacts.
