// Missing poster + social tile templates — pure JSX for Satori (server-side
// SVG rendering). Layouts ported from the Figma export's ScreenMissingPoster
// output components, scaled to production pixel sizes.
//
// Every multi-child div must declare display:flex (Satori requirement).

export type PosterData = {
  name: string;
  breed: string;
  sex: string;
  age: string;
  weight: string;
  colorMarkings: string;
  microchip: string;
  photoDataUri: string | null;
  descriptionForId: string;
  ownerName: string;
  ownerPhone: string;
  lastSeenArea: string;
  lastSeenDate: string; // ISO date or ""
};

export const FORMATS = {
  poster: { width: 1240, height: 1754 }, // A4 portrait @150dpi
  "1x1": { width: 1080, height: 1080 },
  "4x5": { width: 1080, height: 1350 },
  "9x16": { width: 1080, height: 1920 },
} as const;

export type PosterFormat = keyof typeof FORMATS;

const BLUSH = "#F8ECEE";
const CRIMSON = "#510000";
const CRIMSON_DEEP = "#3A0000";
const ROSE = "#B83A52";
const MUTED = "#987080";
const WATERMARK_TEXT = "Made with Quirks & All · quirksandall.itshypothetical.com";

function formatDate(iso: string, withYear: boolean): string {
  if (!iso) return "Today";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Today";
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

function eyebrowStyle(size: number, color: string) {
  return {
    color,
    fontSize: size,
    fontFamily: "Satoshi",
    fontWeight: 700,
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
  };
}

function Watermark({ fontSize, padding }: { fontSize: number; padding: number }) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        padding: `${padding}px 40px`,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <span style={{ color: "#000000", fontSize, letterSpacing: "0.08em", fontFamily: "Satoshi" }}>
        {WATERMARK_TEXT}
      </span>
    </div>
  );
}

function CreamInfoBand({
  d,
  scale,
  padding,
}: {
  d: PosterData;
  scale: number;
  padding: string;
}) {
  return (
    <div style={{ backgroundColor: BLUSH, padding, display: "flex", gap: 16 * scale, flexShrink: 0 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ ...eyebrowStyle(8 * scale, MUTED), marginBottom: 3 * scale }}>Last seen</span>
        <span style={{ color: CRIMSON, fontSize: 13 * scale, fontFamily: "Satoshi", fontWeight: 700, lineHeight: 1.2 }}>
          {d.lastSeenArea || "—"}
        </span>
        <span style={{ color: MUTED, fontSize: 9.5 * scale, fontFamily: "Satoshi", marginTop: 3 * scale }}>
          {formatDate(d.lastSeenDate, false)}
        </span>
      </div>
      {d.descriptionForId ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            borderLeft: "2px solid rgba(152,112,128,0.25)",
            paddingLeft: 16 * scale,
          }}
        >
          <span style={{ ...eyebrowStyle(8 * scale, MUTED), marginBottom: 3 * scale }}>Wearing</span>
          <span style={{ color: CRIMSON, fontSize: 10.5 * scale, fontFamily: "Satoshi", lineHeight: 1.4 }}>
            {d.descriptionForId}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function PhoneFooter({
  d,
  scale,
  padding,
  please,
  showOwnerName,
  grow,
}: {
  d: PosterData;
  scale: number;
  padding: string;
  please?: boolean;
  showOwnerName?: boolean;
  grow?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: CRIMSON_DEEP,
        padding,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        ...(grow ? { flex: 1 } : { flexShrink: 0 }),
      }}
    >
      <span style={{ ...eyebrowStyle(8.5 * scale, "rgba(248,236,238,0.45)"), letterSpacing: "0.2em", marginBottom: 4 * scale }}>
        If you see {d.name}, {please ? "please call" : "call"}
      </span>
      <span style={{ fontFamily: "Tanker", fontSize: 36 * scale, lineHeight: 1, color: BLUSH, letterSpacing: "-0.01em" }}>
        {d.ownerPhone || "—"}
      </span>
      {showOwnerName && d.ownerName ? (
        <span style={{ color: "rgba(248,236,238,0.35)", fontSize: 10 * scale, fontFamily: "Satoshi", marginTop: 6 * scale }}>
          {d.ownerName}
        </span>
      ) : null}
    </div>
  );
}

function Photo({ uri, style }: { uri: string | null; style: Record<string, unknown> }) {
  // The image lives inside a wrapper that carries the layout sizing (which may
  // be flex-derived, e.g. the 9:16 middle band). Satori only resolves
  // objectFit:cover correctly when the <img> has a fully-determined box — so we
  // give the wrapper the caller's style and let the img fill it 100%×100%.
  if (!uri) {
    return <div style={{ ...style, backgroundColor: "#E5BEC4", display: "flex" }} />;
  }
  return (
    <div style={{ ...style, display: "flex", overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={uri} alt="" width="100%" height="100%" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
    </div>
  );
}

// ── Poster (A4 print) ─────────────────────────────────────────────────────────

export function PosterTemplate(d: PosterData) {
  const meta = [d.breed, d.sex, d.age, d.weight, d.colorMarkings].filter(Boolean).join(" · ");
  return (
    <div
      style={{
        width: FORMATS.poster.width,
        height: FORMATS.poster.height,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Satoshi",
        backgroundColor: BLUSH,
      }}
    >
      {/* Header band — deep crimson */}
      <div
        style={{
          backgroundColor: CRIMSON,
          padding: "44px 48px 36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: "Tanker", fontSize: 180, lineHeight: 1, color: BLUSH, letterSpacing: "-0.01em" }}>
          MISSING
        </span>
      </div>

      {/* Photo — full bleed */}
      <Photo uri={d.photoDataUri} style={{ width: FORMATS.poster.width, flex: 1, minHeight: 0 }} />

      {/* Name + meta band — rose */}
      <div style={{ backgroundColor: ROSE, padding: "36px 48px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <span style={{ fontFamily: "Tanker", fontSize: 110, lineHeight: 1, color: BLUSH, letterSpacing: "-0.01em" }}>
          {d.name}
        </span>
        {meta ? (
          <span style={{ color: "rgba(248,236,238,0.7)", fontSize: 30, marginTop: 10, lineHeight: 1.35 }}>{meta}</span>
        ) : null}
      </div>

      {/* Body — blush */}
      <div style={{ backgroundColor: BLUSH, padding: "40px 48px", display: "flex", flexDirection: "column", gap: 28, flexShrink: 0 }}>
        {d.descriptionForId ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ ...eyebrowStyle(22, CRIMSON), letterSpacing: "0.15em", marginBottom: 8 }}>Wearing</span>
            <span style={{ color: CRIMSON, fontSize: 30, lineHeight: 1.5 }}>{d.descriptionForId}</span>
          </div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ ...eyebrowStyle(22, CRIMSON), letterSpacing: "0.15em", marginBottom: 8 }}>Last seen</span>
          <span style={{ color: CRIMSON, fontSize: 32, fontWeight: 700 }}>{d.lastSeenArea || "—"}</span>
          <span style={{ color: MUTED, fontSize: 24, marginTop: 4 }}>{formatDate(d.lastSeenDate, true)}</span>
        </div>
        {d.microchip ? <span style={{ color: MUTED, fontSize: 22 }}>Microchip: {d.microchip}</span> : null}
      </div>

      {/* Phone footer — deep crimson, massive number */}
      <div
        style={{
          backgroundColor: CRIMSON,
          padding: "44px 48px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ ...eyebrowStyle(24, "rgba(248,236,238,0.6)"), marginBottom: 10 }}>If you see {d.name}, call</span>
        <span style={{ fontFamily: "Tanker", fontSize: 120, lineHeight: 1, color: BLUSH, letterSpacing: "-0.01em" }}>
          {d.ownerPhone || "—"}
        </span>
        {d.ownerName ? (
          <span style={{ color: "rgba(248,236,238,0.5)", fontSize: 26, marginTop: 12 }}>{d.ownerName}</span>
        ) : null}
      </div>

      {/* Watermark always present on the poster — free and paid alike */}
      <Watermark fontSize={22} padding={20} />
    </div>
  );
}

// ── 1:1 square tile ───────────────────────────────────────────────────────────

export function SquareTileTemplate(d: PosterData) {
  const scale = 3.15; // Figma preview was ~343px wide
  const sub = [d.breed, d.colorMarkings].filter(Boolean).join(" · ");
  return (
    <div
      style={{
        width: FORMATS["1x1"].width,
        height: FORMATS["1x1"].height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: CRIMSON,
        fontFamily: "Satoshi",
      }}
    >
      {/* Row 1: photo left, "name is missing" right */}
      <div style={{ display: "flex", height: "52%", flexShrink: 0 }}>
        <Photo uri={d.photoDataUri} style={{ width: "52%", height: "100%", flexShrink: 0 }} />
        <div
          style={{
            flex: 1,
            backgroundColor: CRIMSON,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: `${16 * scale}px ${16 * scale}px ${14 * scale}px ${14 * scale}px`,
          }}
        >
          <span style={{ fontFamily: "Tanker", fontSize: 34 * scale, lineHeight: 0.95, color: BLUSH, letterSpacing: "-0.01em" }}>
            {d.name}
          </span>
          <span style={{ fontFamily: "Tanker", fontSize: 34 * scale, lineHeight: 0.95, color: ROSE, letterSpacing: "-0.01em" }}>
            is missing
          </span>
          {sub ? (
            <span style={{ color: "rgba(248,236,238,0.45)", fontSize: 9.5 * scale, lineHeight: 1.35, marginTop: 8 * scale }}>
              {sub}
            </span>
          ) : null}
        </div>
      </div>

      {/* Amber divider */}
<CreamInfoBand d={d} scale={scale} padding={`${10 * scale}px ${16 * scale}px`} />

      {/* No watermark on 1:1 — too tight; kept to poster + 9:16 only */}
      <PhoneFooter d={d} scale={scale} padding={`${10 * scale}px ${16 * scale}px ${8 * scale}px`} grow />
    </div>
  );
}

// ── 4:5 portrait tile ─────────────────────────────────────────────────────────

export function PortraitTileTemplate(d: PosterData) {
  const scale = 3.15;
  const sub = [d.breed, d.colorMarkings].filter(Boolean).join(" · ");
  return (
    <div
      style={{
        width: FORMATS["4x5"].width,
        height: FORMATS["4x5"].height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: CRIMSON,
        fontFamily: "Satoshi",
      }}
    >
      <div style={{ display: "flex", height: "56%", flexShrink: 0 }}>
        <Photo uri={d.photoDataUri} style={{ width: "52%", height: "100%", flexShrink: 0 }} />
        <div
          style={{
            flex: 1,
            backgroundColor: CRIMSON,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: `${18 * scale}px ${18 * scale}px ${16 * scale}px ${16 * scale}px`,
          }}
        >
          <span style={{ fontFamily: "Tanker", fontSize: 34 * scale, lineHeight: 0.95, color: BLUSH, letterSpacing: "-0.01em" }}>
            {d.name}
          </span>
          <span style={{ fontFamily: "Tanker", fontSize: 34 * scale, lineHeight: 0.95, color: ROSE, letterSpacing: "-0.01em" }}>
            is missing
          </span>
          {sub ? (
            <span style={{ color: "rgba(248,236,238,0.45)", fontSize: 9.5 * scale, lineHeight: 1.35, marginTop: 8 * scale }}>
              {sub}
            </span>
          ) : null}
        </div>
      </div>

<CreamInfoBand d={d} scale={scale} padding={`${12 * scale}px ${18 * scale}px`} />

      {/* No watermark on 4:5 — too tight; kept to poster + 9:16 only */}
      <PhoneFooter d={d} scale={scale} padding={`${10 * scale}px ${18 * scale}px ${6 * scale}px`} grow />
    </div>
  );
}

// ── 9:16 story tile ───────────────────────────────────────────────────────────

export function StoryTileTemplate(d: PosterData) {
  const scale = 3.15;
  const sub = [d.breed, d.colorMarkings].filter(Boolean).join(" · ");
  return (
    <div
      style={{
        width: FORMATS["9x16"].width,
        height: FORMATS["9x16"].height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: CRIMSON,
        fontFamily: "Satoshi",
      }}
    >
      {/* Header — tall, centred */}
      <div
        style={{
          backgroundColor: CRIMSON,
          padding: `${20 * scale}px ${24 * scale}px ${18 * scale}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: "Tanker", fontSize: 54 * scale, lineHeight: 0.92, color: BLUSH, letterSpacing: "-0.01em" }}>
          {d.name}
        </span>
        <span style={{ fontFamily: "Tanker", fontSize: 54 * scale, lineHeight: 0.92, color: ROSE, letterSpacing: "-0.01em" }}>
          is missing
        </span>
        {sub ? (
          <span style={{ color: "rgba(248,236,238,0.45)", fontSize: 11 * scale, lineHeight: 1.4, marginTop: 7 * scale }}>
            {sub}
          </span>
        ) : null}
      </div>

{/* Photo — dominant middle section */}
      <Photo uri={d.photoDataUri} style={{ width: "100%", flex: 1, minHeight: 0 }} />

<CreamInfoBand d={d} scale={scale} padding={`${16 * scale}px ${24 * scale}px`} />

      <PhoneFooter
        d={d}
        scale={scale}
        padding={`${16 * scale}px ${24 * scale}px ${20 * scale}px`}
        please
        showOwnerName
      />

      {/* Watermark always present on the 9:16 — free and paid alike */}
      <Watermark fontSize={24} padding={14} />
    </div>
  );
}

export function renderTemplate(format: PosterFormat, d: PosterData) {
  switch (format) {
    case "poster":
      return PosterTemplate(d);
    case "1x1":
      return SquareTileTemplate(d);
    case "4x5":
      return PortraitTileTemplate(d);
    case "9x16":
      return StoryTileTemplate(d);
  }
}
