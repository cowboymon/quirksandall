import { site } from "../site";
import TrackedLink from "./TrackedLink";

// App Store / Google Play badge. Renders a non-interactive "coming soon" chip
// while site.comingSoon is true, otherwise a tracked download link. Shared by
// the home CTA and the blog CTA module.
export default function StoreBadge({
  kind,
  href,
  onDark,
}: {
  kind: "apple" | "google";
  href: string;
  onDark?: boolean;
}) {
  const isApple = kind === "apple";
  const soon = site.comingSoon;
  const icon = (
    <span aria-hidden className="shrink-0">
      {isApple ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 12.53c-.02-2.02 1.65-2.99 1.72-3.04-.94-1.37-2.4-1.56-2.92-1.58-1.24-.13-2.42.73-3.05.73-.63 0-1.6-.71-2.63-.69-1.35.02-2.6.78-3.29 1.99-1.4 2.44-.36 6.04 1 8.02.67.97 1.47 2.06 2.51 2.02 1.01-.04 1.39-.65 2.61-.65 1.22 0 1.56.65 2.63.63 1.09-.02 1.78-.99 2.44-1.96.77-1.12 1.09-2.21 1.11-2.27-.02-.01-2.13-.82-2.15-3.23zM15.03 6.5c.56-.68.94-1.62.83-2.56-.81.03-1.79.54-2.37 1.21-.52.6-.97 1.56-.85 2.48.9.07 1.83-.46 2.39-1.13z" />
        </svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3.6 2.4c-.24.25-.38.63-.38 1.13v16.94c0 .5.14.88.39 1.12l.06.06L13.1 12v-.22L3.66 2.34l-.06.06zM16.24 15.14L13.1 12v-.22l3.14-3.14.07.04 3.72 2.11c1.06.6 1.06 1.59 0 2.2l-3.72 2.11-.07.04zM15.9 15.5L12.68 12.3 3.6 21.4c.35.37.93.42 1.58.05l10.72-6.09M15.9 8.5L5.18 2.4C4.53 2.06 3.95 2.1 3.6 2.48l9.08 9.08L15.9 8.5z" />
        </svg>
      )}
    </span>
  );
  const inner = (
    <>
      {icon}
      <span className="flex flex-col leading-tight text-left">
        <span className="text-[10px] uppercase tracking-wide text-card-dark-label">
          {soon ? "Coming soon to" : isApple ? "Download on the" : "Get it on"}
        </span>
        <span className="text-sm font-semibold">{isApple ? "App Store" : "Google Play"}</span>
      </span>
    </>
  );

  if (soon) {
    return (
      <span
        aria-label={`${isApple ? "App Store" : "Google Play"} — coming soon`}
        className={`flex cursor-default items-center gap-2.5 rounded-button px-4 py-2.5 text-card-dark-text ${
          onDark ? "border border-card-dark-label/60 bg-card-dark-deep" : "bg-button/70"
        }`}
      >
        {inner}
      </span>
    );
  }
  return (
    <TrackedLink
      href={href}
      aria-label={isApple ? "Download on the App Store" : "Get it on Google Play"}
      event="App Download Clicked"
      meta={{ platform: isApple ? "iOS" : "Android" }}
      className="flex items-center gap-2.5 rounded-button bg-button px-4 py-2.5 text-card-dark-text transition-colors hover:bg-button-pressed"
    >
      {inner}
    </TrackedLink>
  );
}
