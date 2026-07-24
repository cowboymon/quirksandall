-- Insurance claims contact/phone is no longer collected. Strip the key from
-- existing pet_vet_info.insurance jsonb (the app has stopped writing it).
update public.pet_vet_info
set insurance = insurance - 'claims_contact'
where insurance ? 'claims_contact';
