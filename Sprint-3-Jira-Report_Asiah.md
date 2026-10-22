# Sprint 3 Jira Report

**Jira project:** Ripple (RIPPLE): https://csci475project.atlassian.net/jira/software/projects/RIPPLE/boards/34

**Sprint:** MUSIC Sprint 3 (Sprint 3), October 13, 2026 – October 23, 2026

**Data as of:** October 21, 2026

## Sprint Commitment vs Delivery

| Metric | Count |
|---|---|
| Issues committed at sprint start | 3 |
| Issues completed | 8 |
| Issues not completed | 0 |
| Issues added mid-sprint | 5 |

Committed at sprint start (added to the sprint on day 1, October 13): RIPPLE-30, RIPPLE-34, RIPPLE-36.
Added mid-sprint: RIPPLE-16 (October 15), RIPPLE-37, RIPPLE-39, RIPPLE-40, RIPPLE-41 (October 18).

## Issue Breakdown by Type

| Type | To Do | In Progress | Done |
|---|---|---|---|
| Story | 0 | 0 | 3 |
| Task | 0 | 0 | 4 |
| Bug | 0 | 0 | 1 |

## Per-Student Work Allocation

| Student | Issues Assigned | Issues Completed |
|---|---|---|
| Asiah Krier | 3 | 3 |
| Israel Mora | 5 | 5 |

## Sprint Issues

| Key | Summary | Type | Assignee | Status |
|---|---|---|---|---|
| RIPPLE-16 | New logo | Task | Asiah Krier | Done |
| RIPPLE-30 | Improve similar-artist suggestions on artist profiles | Task | Asiah Krier | Done |
| RIPPLE-37 | Display all-time top songs on artist profiles | Story | Asiah Krier | Done |
| RIPPLE-34 | Save artist and songs to a library | Story | Israel Mora | Done |
| RIPPLE-36 | Create account signup with unique username, email, and password | Task | Israel Mora | Done |
| RIPPLE-39 | Customize account profile and profile picture | Story | Israel Mora | Done |
| RIPPLE-40 | Resolve Sprint 3 SonarQube findings and dependency vulnerabilities | Bug | Israel Mora | Done |
| RIPPLE-41 | Keep saved-artist navigation and song previews in Ripple and display cover art | Task | Israel Mora | Done |

## Estimation & Accuracy

| Metric | Value |
|---|---|
| Total story points committed | 0 (no story points were assigned in Jira) |
| Total story points completed | 0 (no story points were assigned in Jira) |
| Completion % | N/A by story points; 100% by issue count (8 of 8) |

## Workflow Discipline

- ☑ Issues moved through workflow states (To Do → In Progress → Done). 7 of 8 issues did; RIPPLE-16 went directly from To Do to Done.
- ☑ Issues closed only after acceptance criteria met
- ☐ Sprint completed/closed in Jira (sprint is still active; it ends October 23)

## Blockers & Scope Changes

- **Major blockers:**
  - Spotify's 2026 developer-mode limits removed endpoints like artist top tracks, so all-time top songs (RIPPLE-37) and similar-artist ranking (RIPPLE-30) were built on Last.fm data matched to Spotify.
  - Similar-artist suggestions skipped any artist with a same-name Spotify account, dropping most candidates for smaller artists (e.g., 21 of 30 for Lucy Bedroque). Fixed in RIPPLE-30 by using Spotify's top exact-name match.
  - Account, profile, and library work was split across stacked pull requests that had to be reviewed and merged in order, and SonarCloud findings had to be resolved before merging (RIPPLE-40).
- **Scope changes:**
  - RIPPLE-16 (new logo) was pulled in from the backlog on October 15.
  - RIPPLE-37 (all-time top songs) was added on October 18 as a new feature, since the Spotify player only shows current popular tracks.
  - RIPPLE-39, RIPPLE-40, and RIPPLE-41 were added on October 18 to track profile customization, quality fixes, and library follow-ups split out from RIPPLE-34 and RIPPLE-36.
- **Spillover:** None. All 8 issues were completed. RIPPLE-32 (Link Spotify account), RIPPLE-33 (Discover based on top artists), and RIPPLE-35 (Discover microgenres) remain in the backlog for the next sprint.

## Jira Evidence Links

- **Sprint report:** https://csci475project.atlassian.net/jira/software/projects/RIPPLE/boards/34/reports/sprint-retrospective?sprint=68
- **Backlog:** https://csci475project.atlassian.net/jira/software/projects/RIPPLE/boards/34/backlog
- **Board (Sprint 3):** https://csci475project.atlassian.net/jira/software/projects/RIPPLE/boards/34
- **Sprint 3 issues (filtered):** https://csci475project.atlassian.net/issues?jql=sprint%20%3D%2068%20ORDER%20BY%20key
