-- Two more routine fields:
--  • left_alone  — can the pet be left alone? { ok: "Yes"|"No"|"", detail: text }
--  • toileting_frequency — how often they need to toilet (free text)
alter table public.pet_routine
  add column if not exists left_alone jsonb default '{}'::jsonb,
  add column if not exists toileting_frequency text;
