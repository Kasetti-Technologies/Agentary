# 🛠️ Incident Handling Runbook

## 🔔 When to Trigger
- API returns 5xx errors
- Hash mismatches in golden file
- CI workflow failures on `main`

## 🚨 Immediate Actions
1. Acknowledge the alert in Slack or GitHub.
2. Assign an incident lead.
3. Create a GitHub issue with label `incident`.

## 🔍 Investigation Steps
- Check recent commits and PRs.
- Review CI logs and hash outputs.
- Validate schema changes against `usagepilot.v1.json`.

## ✅ Resolution
- Patch the issue and open a PR.
- Re-run affected workflows.
- Update golden hashes if needed.

## 📝 Postmortem
- Document root cause and fix.
- Add learnings to `README.md` or `runbooks/lessons-learned.md`.
