-- Cap object size on the two owner-uploaded buckets. Neither the client
-- pickers nor the upload helpers enforced a max size, so nothing stopped an
-- oversized (or buggy/malicious) upload from landing in storage and sitting
-- there indefinitely. 10MB comfortably fits a phone photo or a scanned/photo'd
-- vaccination certificate.
update storage.buckets set file_size_limit = 10 * 1024 * 1024 where id = 'pet-photos';
update storage.buckets set file_size_limit = 10 * 1024 * 1024 where id = 'pet-documents';
