# plate-pool

A calculator for any plate-loaded gym. It answers Load, List and Reverse for the implements in an inventory file, which share one plate pool.

[docs/spec.md](docs/spec.md) is the source of truth. Read it before you change anything. Use the words in its glossary (section 2) and no synonyms.

## Repo rules

- **Personal account only.** The repo lives at `joeuk89/plate-pool`. Nothing goes under any other account or organisation.
- **Commit email.** Every commit uses the owner's personal address. Before you commit, check that `git config user.email` matches `git log -1 --format=%ae main`. If it differs, set it with `git config user.email` in this clone. A fresh clone or a worktree can fall back to a different global address.
- **The repo is public.** Commits, issues and files hold no personal data: no order numbers, prices, dates of purchase, addresses or phone numbers.
- **The app needs no AI.** Every answer comes from a fixed calculation over the inventory file. Add no model call and no agent step to the app.
- **Scope is fixed.** Version 1 is spec sections 5 to 15, version 2 is section 16 and version 3 is section 17. Build nothing from spec section 3 "Out of scope" or section 15 beyond what sections 16 and 17 bring in.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `joeuk89/plate-pool`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. See `docs/agents/domain.md`.
