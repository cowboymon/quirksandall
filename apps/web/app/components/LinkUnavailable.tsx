export default function LinkUnavailable({ petName, ownerName }: { petName?: string; ownerName?: string }) {
  const pet = petName?.trim();
  const owner = ownerName?.trim();
  const title = pet ? `${pet}'s profile isn't available anymore.` : "This link's done its job.";
  const body = owner
    ? `Ask ${owner} for a new link.`
    : "The owner may have updated the link — ask them for a new one.";
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-24">
      <div className="text-center max-w-sm">
        <h1 className="font-tanker text-3xl font-normal leading-tight text-foreground">
          {title}
        </h1>
        <p className="mt-4 font-satoshi text-base leading-relaxed text-text-muted">
          {body}
        </p>
      </div>
    </main>
  );
}
