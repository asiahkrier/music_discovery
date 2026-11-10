# Sprint 4 Jira Report

**Jira project:** [Ripple (RIPPLE)](https://csci475project.atlassian.net/jira/software/projects/RIPPLE/boards/34)

**Sprint:** MUSIC Sprint 4 start November 3, 2026 - November 7, 2026

**Work reporting period:** October 27–November 6, 2026

**Data as of:** November 6, 2026.

**Sprint status:** All 12 retained issues are Done. The sprint itself remains Active in Jira.

## Sprint Commitment vs Delivery

| Metric | Count |
| --- | --- |
| Issues committed at recorded sprint start (among retained issues) | 11 |
| Issues completed (currently Done) | 12 |
| Issues not completed (retained scope) | 0 |
| Issues added after recorded sprint start (retained) | 1 |

The 11 earlier retained issues were already assigned to Sprint 4 before its recorded November 3 start. RIPPLE-56 was added November 6 to record the Spotify request reductions. Seven retained issues were already Done before November 3, five reached Done afterward.

## Issue Breakdown by Type

| Type | To Do | In Progress | Done |
| --- | --- | --- | --- |
| Story | 0 | 0 | 5 |
| Task | 0 | 0 | 4 |
| Bug | 0 | 0 | 3 |

## Per-Student Work Allocation

| Student | Issues Assigned | Issues Completed |
| --- | --- | --- |
| Israel Mora | 10 | 10 |
| Asiah Krier | 2 | 2 |

## Sprint Issues

| Key | Summary | Type | Assignee | Status |
| --- | --- | --- | --- | --- |
| [RIPPLE-35](https://csci475project.atlassian.net/browse/RIPPLE-35) | Discover microgenres | Story | Asiah Krier | Done |
| [RIPPLE-42](https://csci475project.atlassian.net/browse/RIPPLE-42) | Fix user profile | Bug | Israel Mora | Done |
| [RIPPLE-44](https://csci475project.atlassian.net/browse/RIPPLE-44) | Create Ripple Mix from saved artists and songs | Story | Israel Mora | Done |
| [RIPPLE-45](https://csci475project.atlassian.net/browse/RIPPLE-45) | Add profile-picture account dropdown with profile, settings and logout | Story | Israel Mora | Done |
| [RIPPLE-46](https://csci475project.atlassian.net/browse/RIPPLE-46) | Show username and email availability during signup | Bug | Israel Mora | Done |
| [RIPPLE-47](https://csci475project.atlassian.net/browse/RIPPLE-47) | Fix Sprint 4 SonarCloud and dependency issues | Bug | Israel Mora | Done |
| [RIPPLE-48](https://csci475project.atlassian.net/browse/RIPPLE-48) | Test account settings and Ripple Mix | Task | Israel Mora | Done |
| [RIPPLE-50](https://csci475project.atlassian.net/browse/RIPPLE-50) | Suggest artists and songs while typing | Story | Israel Mora | Done |
| [RIPPLE-51](https://csci475project.atlassian.net/browse/RIPPLE-51) | Clean up unused code and update documentation | Task | Israel Mora | Done |
| [RIPPLE-52](https://csci475project.atlassian.net/browse/RIPPLE-52) | Remove personal Spotify connection options | Task | Israel Mora | Done |
| [RIPPLE-54](https://csci475project.atlassian.net/browse/RIPPLE-54) | Document how the Ripple Score is calculated | Story | Asiah Krier | Done |
| [RIPPLE-56](https://csci475project.atlassian.net/browse/RIPPLE-56) | Spotify reductions | Task | Israel Mora | Done |

## Backlog Activity / Consolidation

RIPPLE-57 and RIPPLE-58 were consolidated into RIPPLE-56 and removed from Sprint 4. They are excluded from the 12 retained issues and completion totals. This is not unfinished delivery.

## Estimation & Accuracy

| Metric | Value |
| --- | --- |
| Total story points committed | Not recorded |
| Total story points completed | Not recorded |
| Completion % (story points) | N/A — story points not recorded |
| Completion % (current issue count) | 100% — 12 of 12 retained issues are Done |

## Workflow Discipline

- [ ] All issues moved through To Do → In Progress → Done.
- [ ] Issues closed only after acceptance criteria met (not independently verified for every issue).
- [ ] Sprint completed/closed in Jira.

Some retrospective tasks moved directly from To Do to Done. Jira completion status alone does not prove all acceptance criteria were tested.

## Blockers & Scope Changes

- Delivered account settings, avatar navigation, live signup checks, and artist/song search suggestions.
- Ripple Mix changed from personal Spotify account inputs to saved Ripple artists and songs the personal Spotify connection controls were removed. Spotify still supplies catalog data and previews.
- Improved mix variety and recent artist/song repeat avoidance and added microgenre discovery and scoring documentation.
- Spotify rate limits interrupted catalog loading. Caching, fewer requests, and loading extra results on demand were added, these reduce requests but cannot guarantee provider availability. Have a chance to get Spotify rate-limited again due to too many requests.
- SonarCloud/dependency quality fixes remain grouped under RIPPLE-47. Unused code and documentation were cleaned up.
- No retained issues remain unfinished. Formal sprint closure is pending.

## Jira Evidence Links

- **Sprint report:** [Select MUSIC Sprint 4](https://csci475project.atlassian.net/jira/software/projects/RIPPLE/boards/34/reports/burnup)
- **Backlog:** [Ripple backlog](https://csci475project.atlassian.net/jira/software/projects/RIPPLE/boards/34/backlog)
- **Board:** [Ripple board](https://csci475project.atlassian.net/jira/software/projects/RIPPLE/boards/34)
- **Sprint filter:** [Sprint 69 issues](https://csci475project.atlassian.net/issues/?jql=project%20%3D%20RIPPLE%20AND%20sprint%20%3D%2069)
