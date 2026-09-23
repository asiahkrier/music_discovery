# Sprint 1 Jira Report

- **Project:** [Ripple (RIPPLE)](https://csci475project.atlassian.net/jira/software/projects/RIPPLE)
- **Sprint:** MUSIC Sprint 1 (Sprint 1, ID 34).
- The project key changed from MUSIC to RIPPLE; the sprint still retains its original name.

## Sprint Commitment vs Delivery

| Metric | Count |
| --- | ---: |
| Issues committed at sprint start | 8 |
| Issues completed as of report snapshot | 10 |
| Issues not completed as of report snapshot | 0 |
| Issues added mid-sprint | 2 |

The initial commitment is reconstructed from the previously reviewed creation and sprint histories: RIPPLE-1 through RIPPLE-8 existed before sprint start. RIPPLE-9 and RIPPLE-10 were added afterward. Current completion totals include work finished after the scheduled end.

| Historical cutoff | Completed | Not completed |
| --- | ---: | ---: |
| Scheduled end, September 21 at 2:11 p.m. CDT | 8 | 2 |
| End of September 21 calendar day | 9 | 1 |
| September 22 report snapshot | 10 | 0 |

RIPPLE-7 was marked Done on September 21 at 8:39 p.m. CDT; RIPPLE-10 was marked Done on September 22 at 1:02 a.m. CDT.

## Issue Breakdown by Type

Current issue statuses:

| Type | To Do | In Progress | Done |
| --- | ---: | ---: | ---: |
| Story | 0 | 0 | 8 |
| Task | 0 | 0 | 2 |
| Bug | 0 | 0 | 0 |

Three code issues were fixed through PRs, but no separate Jira Bug tickets were created for them. They are described below and are not counted as additional Jira issues.

## Per-Student Work Allocation

| Student | Issues Assigned | Issues Completed |
| --- | ---: | ---: |
| Israel Mora | 6 | 6 |
| Asiah Krier | 4 | 4 |
| **Total** | **10** | **10** |

## Estimation & Accuracy

| Metric | Value |
| --- | --- |
| Total story points committed | Not recorded |
| Total story points completed | Not recorded |
| Completion % by story points | N/A — story point estimates were not entered |

Current completion by issue count is 10/10 (100%). This is separate from story-point completion and does not mean all issues were finished by the scheduled deadline.

## Workflow Discipline

- [ ] Issues consistently moved through To Do → In Progress → Done.
- [ ] Issues closed only after acceptance criteria were met.
- [x] Sprint completed/closed in Jira — reported by Israel.

Some issues moved directly from To Do to Done, so the full workflow was not followed consistently. Acceptance-criteria verification has not been confirmed; descriptions added afterward do not establish that verification occurred during the sprint.

## Blockers & Scope Changes

- Render deployment required correcting the server listening address to 0.0.0.0.
- SonarQube findings required changes to the Trivy workflow, list helper, and biography normalization.
- A later Render deployment failed because html-to-text was imported without the dependency being included in the committed package manifests. [PR #11](https://github.com/asiahkrier/music_discovery/pull/11) added the dependency.
- RIPPLE-9 (Render deployment) and RIPPLE-10 (demo presentation) were added after sprint start.

## Code Issues Fixed During Sprint 1

These fixes were part of the sprint's code-quality work , SonarQube and TrivyScans, and were completed almost immediately so I did not tracked as separate Jira Bug tickets.

| Category | Fix | Evidence |
| --- | --- | --- |
| Security | Pin the Trivy action to a full commit SHA to address the SonarQube workflow finding. | [PR #8](https://github.com/asiahkrier/music_discovery/pull/8) |
| Maintainability | Replace the nested ternary in the list function with explicit conditional returns for clearer structure. | [PR #9](https://github.com/asiahkrier/music_discovery/pull/9) |
| Reliability | Use html-to-text for artist biography normalization instead of the flagged regular-expression processing. | [PR #10](https://github.com/asiahkrier/music_discovery/pull/10) |

## Jira Evidence Links

- [Sprint reports](https://csci475project.atlassian.net/jira/software/projects/RIPPLE/boards/34/reports) — select MUSIC Sprint 1.
- [Sprint burndown report](https://csci475project.atlassian.net/jira/software/projects/RIPPLE/boards/34/reports/burndown?source=overview) — select MUSIC Sprint 1.
- [Backlog](https://csci475project.atlassian.net/jira/software/projects/RIPPLE/boards/34/backlog).
- [Board](https://csci475project.atlassian.net/jira/software/projects/RIPPLE/boards/34) — select Sprint 1 where available.
- [Issue list filtered specifically to Sprint 1](https://csci475project.atlassian.net/issues/?jql=project%20%3D%20RIPPLE%20AND%20sprint%20%3D%2034).



