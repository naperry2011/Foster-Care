# Git Analysis

**Repo:** `C:\Users\Perry\Dropbox\PC\Documents\GitHub\Foster-Care`
**Remote:** `https://github.com/naperry2011/Foster-Care.git`
**HEAD:** `980985b` on `main`, working tree clean.

---

## 1. Volume

| Metric | Value |
|---|---|
| Total commits (all branches) | 34 |
| Commits reachable from `HEAD` | 34 (no orphaned work) |
| Merge commits | 1 |
| Tracked files | 110 |
| Active span | 2026-07-12 to 2026-07-26 (14 calendar days, 2 working days) |

## 2. Contributors

| Name | Email | Commits | First | Last |
|---|---|---:|---|---|
| Nicholas Perry | perry.ai2011@gmail.com | 34 (100%) | 2026-07-12 | 2026-07-26 |

Single author, single identity. No email fragmentation. 33 of 34 commits carry a
`Co-Authored-By: Claude Opus 5` trailer, so the history is transparently AI-paired
rather than quietly so.

One administrative note: the committer address (`perry.ai2011@gmail.com`) differs
from the account address on file (`nuperry2011@gmail.com`). If both are not linked
on the GitHub account, the contribution graph will not attribute this work.

## 3. Monthly volume

| Month | Commits |
|---|---:|
| 2026-07 | 34 |

The entire history sits inside one month. There is no trend to read yet, which is
itself the honest finding: this repository has no cadence data.

## 4. Weekly cadence

| ISO week | Commits | Insertions | Deletions | Total lines |
|---|---:|---:|---:|---:|
| 2026-W28 | 8 | 10,743 | 268 | 11,011 |
| 2026-W29 | 0 | 0 | 0 | 0 |
| 2026-W30 | 26 | 7,803 | 771 | 8,574 |
| **Total** | **34** | **18,546** | **1,039** | **19,585** |

W29 is a full zero week between the bootstrap session and the push to production.
Merge commits report no `--shortstat`, so real churn is marginally higher than
shown. Deletions are 5.6% of insertions, which is the signature of greenfield
build-out rather than refactoring.

## 5. Top single-day commit counts

| Rank | Date | Commits | Window |
|---:|---|---:|---|
| 1 | 2026-07-26 | 26 | 09:34 to 15:56 (6h22m, roughly 15 min per commit) |
| 2 | 2026-07-12 | 8 | 17:12 to 20:48 (3h36m) |

Only two active days exist. Both are marathon sessions. This is burst development,
not sustained cadence, and the hygiene scorecard below reflects that rather than
penalizing it: a two-day-old repository cannot demonstrate cadence.

## 6. Commit message quality

Sampled all 34 (the population is smaller than the 30-message sample the method
calls for).

### Bootstrap period

| Hash | Subject | Quality |
|---|---|---|
| `b889467` | Milestone 0: foundation, Next.js scaffold, Porchlight schema, RLS, auth | adequate |
| `79a6417` | Milestone 1: capture, events + QR, public capture page, quick-add, stage board | adequate |
| `6cb8bb7` | Milestone 2: warmth, consent-enforced send layer, nurture, waiting room | adequate |
| `c43dded` | Milestone 3: ambassadors + attribution ledger | adequate |
| `80375eb` | Docs: Porchlight README (setup, enforced rules, system endpoints) | adequate |
| `258dd9a` | Landing page: public marketing page at / for signed-out visitors | good |
| `389939d` | Landing redesign: warm storybook feel, house scene, handwritten notes, quilt | good |
| `d17a6d9` | Harden deploys without Supabase env: landing renders, middleware doesn't crash | good |
| `3fc2e05` | AI context docs: scaffold docs/ai/ + llms.txt | adequate |
| `b695c1e` | Plan Milestone 4 (pilot readiness) as four phases in docs/ai/tasks.md | good |

The four `Milestone N:` commits are the weak spot, and the problem is size rather
than wording. `b889467` is 28 files and 7,778 insertions; `79a6417` is 13 files and
1,060. No subject line can honestly summarize 7,778 lines, and neither commit can
be reverted or bisected in isolation. See F-017.

### Mid period

| Hash | Subject | Quality |
|---|---|---|
| `659c9b6` | First live run against Supabase: fix four defects found by driving the real flow | good |
| `c9b2a69` | SECURITY: 0003's erasure RPC was callable by anyone; add anon surface audit | good |
| `8017421` | Verify 0004: anon erasure hole closed, all suites green | good |
| `b6d2c6c` | M5 Slice A: app shell, sign-out, and three real bugs | good |
| `626fbae` | Verify Slice A against live DB; audit quick_add_contact | good |
| `7271a62` | M5 Slice B: contact detail page, interaction timeline, search | good |
| `8cf0096` | M5 Slice C: bring the storybook design into the signed-in app | good |
| `2150685` | M5 Slice D: one-click demo agency (code; migration 0006 pending) | good |
| `1c21216` | Verify demo agency against live DB; sharpen the waiting-room callout | good |
| `76554a9` | Docs: record M5 A-D, plan slice E, correct the Next.js version | good |

This period is notably strong. `c9b2a69` names the vulnerability, the migration
that introduced it, and the mitigation, in the subject line. The recurring
"Verify X against live DB" commits create an auditable evidence trail, which is
uncommon and valuable. The `(migration NNNN pending)` suffix honestly flags partial
state rather than hiding it.

### Recent period

| Hash | Subject | Quality |
|---|---|---|
| `6c2c023` | M5 Slice E: Arizona data dashboard (code; migration 0007 pending) | good |
| `2794d12` | M5 Slice F: onboarding progress (code; migration 0008 pending) | good |
| `95b6aa8` | M5 Slice G: teammates and a getting-started checklist (migration 0009 pending) | good |
| `8e7d911` | M5 Slice H: extend the suites, and close what they found | good |
| `be140bc` | Demo agency shows M5's work; three fixes found by looking at the pages | good |
| `c17b15c` | M5 Slice H: ADR-008, 009 and 012; docs brought up to date | good |
| `ecd14ee` | Merge Milestone 5, client-ready | adequate |
| `9742295` | Record Milestone 5 in the plan | good |
| `e9b4eba` | Runbook for the porchlightfostercare.org deploy | good |
| `be51211` | Record the live verification, and the redirect cost on the QR path | good |
| `5536333` | Apex now serves Production; QR path has no redirect | good |
| `eead9f3` | Verify the auth redirect allow-list without sending email | good |
| `8e428d6` | Docs: bring the AI context set up to date with production | good |
| `980985b` | README: lead with the problem, not the setup steps | good |

**Convention:** prose-style imperative subjects with an informal `Area:` or
`M5 Slice X:` prefix. Not Conventional Commits, but internally consistent, and 30
of 34 carry substantial explanatory bodies, several of them 150 words or more
documenting root cause, trade-offs, and deliberate omissions.

**Tally:** 25 good, 9 adequate, 0 poor.

**Nits:** nine subjects exceed 72 characters (longest 95, at `3fc2e05`), which
truncates in `git log --oneline` and in the GitHub UI.

## 7. Branching state

| Item | State |
|---|---|
| Local branches | `main` only |
| Remote branches | `origin/main` plus the `origin/HEAD` symref |
| Tags | none |
| Merge commits | 1, `ecd14ee`, ort strategy |
| Deleted branches | `m5-client-ready`, created 12:13 and merged 14:23 on 2026-07-26 |
| Force-push evidence | none; all 10 `origin/main` reflog entries are fast-forward `update by push` |
| Working tree | clean |

History is effectively linear: 33 commits direct to `main` plus one short-lived
feature branch. There are no release tags despite five completed milestones and a
live production deploy, so nothing in the repository marks what is currently
serving `porchlightfostercare.org`. See F-016.

## 8. Repo size and large objects

```
count: 491        (loose objects)
size: 688.14 KiB
in-pack: 0
packs: 0
garbage: 0
```

688 KiB total, which is very small and healthy. All 491 objects are loose and
nothing has ever been packed; a `git gc` would likely cut on-disk size by 70 to 80
percent. Not run here, since this audit is read-only.

### Ten largest blobs in history

| # | Size | Path |
|---:|---:|---|
| 1-4 | 232-244 KB each | `package-lock.json` (four revisions) |
| 5 | 25.3 KB | `src/app/favicon.ico` |
| 6 | 19.9 KB | `scripts/smoke-test.mjs` |
| 7-8 | 15.7-19.8 KB | `src/components/Landing.tsx` (two revisions) |
| 9 | 14.4 KB | `docs/ai/memory.md` |
| 10 | 14.4 KB | `src/app/(app)/arizona/page.tsx` |

Four lockfile revisions account for roughly 961 KB of about 1 MB of blob content,
which is the normal and correct cost of committing a lockfile. No binaries, media,
datasets, or archives anywhere in history. Nothing warrants a history rewrite.

## 9. `.gitignore` review

The stock Next.js template plus one project addition. Coverage of `node_modules`,
`.next/`, `out/`, `build`, `coverage`, `.env*`, `.vercel`, `*.tsbuildinfo`, `*.pem`
and `/az_docs` is correct, and the `/az_docs` entry carries an inline comment
explaining why, which is good practice.

**The one real defect:** `.env*` on line 34 also excludes `.env.example`. That file
exists on disk, contains placeholders only, and is the second step of the README's
setup instructions, but `git ls-files` confirms it has never been tracked. A fresh
clone cannot follow the documented setup. See F-009.

**Missing, worth adding:**

- `.idea/` and `*.swp`. No JetBrains or Vim coverage.
- `Thumbs.db`, `Desktop.ini`, and Dropbox artifacts (`.dropbox`, `.dropbox.attr`,
  `*.sync-conflict*`). This is a Windows repository inside a Dropbox-synced folder,
  so conflict copies of the form `filename (Perry's conflicted copy).ts` are a live
  risk in exactly this setup. `.DS_Store` is covered but the Windows and Dropbox
  equivalents are not.
- `*.log`. Only the `npm-debug.log*` and `yarn-*` variants are caught.

**Tracked but worth a decision:** `.claude/launch.json` is committed. Fine if the
dev-server config is meant to be shared; move it to a `.local` variant if it ever
picks up machine-specific paths.

## 10. Hygiene scorecard

Ten dimensions, three points each.

| # | Dimension | Score | Note |
|---|---|---:|---|
| 1 | Bus factor / contributor diversity | 0 / 3 | Single author, single machine, no second reviewer |
| 2 | Commit message quality | 3 / 3 | 25 good, 0 poor, substantial bodies |
| 3 | Commit atomicity | 1 / 3 | Four bootstrap commits of 1,000 to 7,778 lines |
| 4 | Branching model | 1 / 3 | 33 commits direct to `main`, one feature branch |
| 5 | Release tagging | 0 / 3 | No tags; nothing marks what is in production |
| 6 | Secrets in history | 3 / 3 | Clean across all 34 commits and all refs |
| 7 | `.gitignore` quality | 2 / 3 | Correct coverage, but blocks `.env.example` |
| 8 | Repo size and binaries | 3 / 3 | 688 KiB, no binaries, no datasets |
| 9 | History integrity | 3 / 3 | No force-push, no rebase, no reset |
| 10 | CI and branch protection | 0 / 3 | No workflows, no gates, no protection |
| | **Total** | **16 / 30** | |

The shape of that score is worth reading carefully. Everything in the author's
direct control (messages, integrity, size, secrets) scores at or near full marks.
Everything that requires a second person or a machine (bus factor, CI, protected
branches, review) scores zero. This is not carelessness; it is the honest profile
of a well-run one-person repository that has never had a second contributor.

---
generated_by: codebase-audit skill v1.1
generated_on: 2026-07-26
project: C:\Users\Perry\Dropbox\PC\Documents\GitHub\Foster-Care
project_type: node
verification: full
---
