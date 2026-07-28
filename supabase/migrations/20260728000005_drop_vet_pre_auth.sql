-- Remove the vet pre-authorisation flag entirely (see PR description). It
-- displayed an unverifiable authorisation claim on a page a sitter reads,
-- risking the sitter believing they held authority to make treatment
-- decisions — vets won't act on it, so it carried no operational benefit
-- against that risk, and it reintroduced the liability surface the product
-- deliberately avoided by not generating a treatment-authorisation document.
--
-- Replaced by a decision-contact designation on backup_contacts (jsonb, no
-- schema change needed there): each contact may carry
--   is_decision_contact boolean
--   decision_priority    integer
-- Instructional only ("call this person first") — never rendered with any
-- language implying legal or clinical authority.

alter table public.pet_vet_info
  drop column if exists vet_pre_auth;
