"use client";

// Safety net: if the admin page render throws, show a readable message and a
// retry instead of a raw 500. The digest lets us match it to the server logs.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="font-tanker text-4xl text-foreground">Admin</h1>
      <p className="mt-4 text-text-muted">
        Something went wrong loading the dashboard. This is usually a Supabase
        configuration issue (URL or service key) in the deployment.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-text-muted">
          Reference: <code>{error.digest}</code>
        </p>
      )}
      <button
        onClick={reset}
        className="mt-6 rounded-button border border-border bg-card-bg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/50"
      >
        Try again
      </button>
    </main>
  );
}
