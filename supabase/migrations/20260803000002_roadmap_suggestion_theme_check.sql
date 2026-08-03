-- Defense-in-depth for the AI-assigned suggestion theme: application code
-- (classify.ts matchTheme) already constrains this to an exact match against
-- the fixed THEMES list before it's ever written, but a DB-level CHECK means
-- a future code path can't accidentally persist an unvalidated model reply
-- (or anything else) into this column — the AI's output is never trusted to
-- decide what's allowed on its own, the schema enforces it too.
alter table roadmap_suggestions
  add constraint roadmap_suggestions_theme_check
  check (
    theme is null or theme in (
      'Sharing & links',
      'Reminders & check-ins',
      'Cats & other species',
      'Medical & safety',
      'Missing pet / poster',
      'Pricing & unlock',
      'Sitter experience',
      'Something else'
    )
  );
