# PeekabooR6 — working rules

Inherits everything in `../CLAUDE.md` (Chase's site-building rules). This file
adds repo-specific workflow rules.

## Speed rules for UI tasks

- **Skip `npm run lint`.** ESLint isn't configured here, so `next lint` hangs on
  its interactive first-run setup. `npm run build` is the only code check.
- **Build once, at the end.**
- **Screenshots: only the page you changed, at 390 and 1470.** This replaces any
  longer list of widths in a prompt's CHECKS.
- **Compare other pages with main only if** you changed shared components, or CSS
  that is actually used outside the page you changed.
- **Performance trace: one 3-second trace at 390**, only when you add or change
  animation.
- **Keep any measurement a prompt asks for** (CLS, overlaps). Those are quick.
- **Don't explore files the prompt doesn't name.**
- **Auto mode: don't stop to show diffs.** Put the diff stat in the report. This
  overrides the "show me a diff before applying" rule in `../CLAUDE.md` for as
  long as auto mode is on.
- **Report in 5 lines:** what changed, the commit, the rollback deploy ID,
  anything that failed.
