-- Share presets (column only — UI deferred to a future release, every new link
-- defaults to 'walk') + missing-poster fields + owner-set link labels.

alter table share_links
  add column preset text not null default 'walk'
    check (preset in ('walk', 'stay', 'full'));

alter table share_links
  add column label text;

-- "What to look for" — missing poster only, never shown on the recipient page
alter table pets
  add column description_for_id text;
