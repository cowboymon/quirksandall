export default function LinkUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-24">
      <div className="text-center">
        <h1 className="font-tanker text-3xl font-normal leading-none text-foreground">
          This link&apos;s done its job.
        </h1>
        <p className="mt-4 font-satoshi text-base leading-relaxed text-text-muted">
          Ask for a new one.
        </p>
      </div>
    </main>
  );
}
