// Logs a Supabase/Postgres error without its `details`/`hint` fields — those
// commonly echo back the literal value that violated a constraint (e.g. a
// unique-violation on an email column includes the email in `details`), so
// logging the full error object risks writing user PII into the hosting
// platform's log aggregator. code + message is enough to diagnose a failure
// without carrying submitted data along with it.
export function logSupabaseError(label: string, error: { code?: string; message?: string } | null | undefined): void {
  console.error(label, { code: error?.code, message: error?.message });
}
