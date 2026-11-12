# Sprint 4 Jira Report

**Jira project:** Ripple (RIPPLE): https://csci475project.atlassian.net/jira/software/projects/RIPPLE/boards/34

**Sprint:** MUSIC Sprint 4 (Sprint 4), October 21, 2026 – November 10, 2026

**Jira sprint dates:** started in Jira November 3, 2026; scheduled end November 8, 2026; completed in Jira November 10, 2026

## Sprint Commitment vs Delivery

| Metric | Count |
|---|---|
| Issues committed at sprint start | 11 |
| Issues completed | 12 |
| Issues not completed | 0 |
| Issues added mid-sprint | 1 |

Committed at sprint start (in the sprint before it was started in Jira on November 3): RIPPLE-35, RIPPLE-42, RIPPLE-44, RIPPLE-45, RIPPLE-46, RIPPLE-47, RIPPLE-48, RIPPLE-50, RIPPLE-51, RIPPLE-52, RIPPLE-54.
Added mid-sprint: RIPPLE-56 (November 6).

## Issue Breakdown by Type

| Type | To Do | In Progress | Done |
|---|---|---|---|
| Story | 0 | 0 | 5 |
| Task | 0 | 0 | 4 |
| Bug | 0 | 0 | 3 |

## Per-Student Work Allocation

| Student | Issues Assigned | Issues Completed |
|---|---|---|
| Asiah Krier | 2 | 2 |
| Israel Mora | 10 | 10 |

## Sprint Issues

| Key | Summary | Type | Assignee | Status |
|---|---|---|---|---|
| RIPPLE-35 | Discover microgenres | Story | Asiah Krier | Done |
| RIPPLE-54 | Document how the Ripple Score is calculated | Story | Asiah Krier | Done |
| RIPPLE-42 | Fix user profile | Bug | Israel Mora | Done |
| RIPPLE-44 | Create Ripple Mix from saved artists and songs | Story | Israel Mora | Done |
| RIPPLE-45 | Add profile-picture account dropdown with profile, settings and logout | Story | Israel Mora | Done |
| RIPPLE-46 | Show username and email availability during signup | Bug | Israel Mora | Done |
| RIPPLE-47 | Fix Sprint 4 SonarCloud and dependency issues | Bug | Israel Mora | Done |
| RIPPLE-48 | Test account settings and Ripple Mix | Task | Israel Mora | Done |
| RIPPLE-50 | Suggest artists and songs while typing | Story | Israel Mora | Done |
| RIPPLE-51 | Clean up unused code and update documentation | Task | Israel Mora | Done |
| RIPPLE-52 | Remove personal Spotify connection options | Task | Israel Mora | Done |
| RIPPLE-56 | Spotify reductions | Task | Israel Mora | Done |

## Estimation & Accuracy

| Metric | Value |
|---|---|
| Total story points committed | 0 (no story points were assigned in Jira) |
| Total story points completed | 0 (no story points were assigned in Jira) |
| Completion % | N/A by story points; 100% by issue count (12 of 12) |

## Workflow Discipline

- ☑ Issues moved through workflow states (To Do → In Progress → Done). 8 of 12 issues did; RIPPLE-50, RIPPLE-51, RIPPLE-52 and RIPPLE-56 were logged after the work was finished and went directly from To Do to Done.
- ☑ Issues closed only after acceptance criteria met
- ☑ Sprint completed/closed in Jira (November 10, 2026)

## Blockers & Scope Changes

- **Major blockers:**
  - Spotify's developer-mode request limit: similar artists, microgenres, the Ripple Mix and search suggestions all share one Spotify app account, and the site showed "temporarily unavailable" when the limit was hit. Fixed by caching Spotify matches and reducing requests in each feature (RIPPLE-56, PRs #45 and #47).
  - Personal Spotify account linking could not be used by testers: Spotify's developer mode only allows manually added users, and connections failed for team members.
  - The new Ripple Mix code failed the SonarCloud quality gate with 10.6% duplicated code (PR #37). Fixed by moving shared code into `mix-shared.js` and `fake-supabase.js` (RIPPLE-47).
- **Scope changes:**
  - RIPPLE-44 changed from a mix built on Spotify listening to a mix built only from Ripple saves, so it works without a Spotify login. Personal Spotify connection was removed (RIPPLE-52), and the separate Spotify-linking story was dropped.
  - RIPPLE-50, RIPPLE-51 and RIPPLE-52 were added on November 2 to track work done for search suggestions, cleanup and removing Spotify connection.
  - RIPPLE-54 (Ripple Score documentation) was added after the professor asked for an explanation of how the Ripple Score is calculated. It replaces an earlier issue that was accidentally deleted.
  - RIPPLE-56 (Spotify reductions) was added mid-sprint on November 6 after the rate-limit problem.
- **Spillover:** None. All 12 issues were completed. RIPPLE-55 (Blend Ripple users' saved artists into recommendations) remains in the backlog for the next sprint.

## Jira Evidence Links

- **Sprint report:** https://csci475project.atlassian.net/jira/software/projects/RIPPLE/boards/34/reports/sprint-retrospective?sprint=69
- **Backlog:** https://csci475project.atlassian.net/jira/software/projects/RIPPLE/boards/34/backlog
- **Board (Sprint 4 issues, filtered):** https://csci475project.atlassian.net/issues?jql=sprint%20%3D%2069%20ORDER%20BY%20key
