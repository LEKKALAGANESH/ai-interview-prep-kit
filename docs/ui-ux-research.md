# UI/UX research — AI Interview Prep Kit

Updated: 2026-09-19

## Research basis

- shadcn/ui emphasizes accessible, composable components, open code, predictable composition, and strong defaults. https://ui.shadcn.com/docs
- shadcn's dashboard example demonstrates a dense but organized application shell with clear navigation and reusable surfaces.
- Vercel Geist emphasizes high-contrast accessible colors, grid discipline, typography hierarchy, and developer-oriented simplicity.
- Vercel design-engineering guidance emphasizes polished interactions, accessibility, cross-browser consistency, and iterative refinement.
- Geist loading guidance recommends action-specific loading feedback, preserving trigger focus, and respecting reduced-motion preferences.
- Current open-source Next.js + Tailwind + shadcn dashboard projects were reviewed for responsive layout and production-oriented patterns.

## Principles adopted

1. Clarity before decoration.
2. One primary action per surface.
3. Progressive disclosure through Overview, Question bank, Study plan, and Practice.
4. Make research grounding discoverable through source chips.
5. Stage text edits locally and save explicitly; do not send an API request on every keystroke.
6. Make coverage, loading, errors, saved state, and practice progress explicit.
7. Use semantic native controls, visible focus, live status messaging, and reduced-motion support.
8. Collapse desktop information hierarchy cleanly on mobile.
9. Use motion only when it communicates a state change.
10. Keep a consistent spacing, border, radius, and semantic-color grammar.

## Deliberately avoided

- Heavy glassmorphism as the main information surface.
- Decorative gradients everywhere.
- Dashboard metrics that do not support a user decision.
- Unlabelled icon-only controls.
- Autosaving text areas on every keystroke.
- Fake AI animations that do not represent actual work.

## Implemented

- New PrepKit application shell and landing experience.
- Responsive generator card with provider selector.
- Four-section kit workspace.
- Requirement-level coverage visualization.
- Company research source visibility.
- Explicit question save/discard workflow.
- Focused practice session UI.
- Responsive study plan.
- Keyboard focus and reduced-motion behavior.
