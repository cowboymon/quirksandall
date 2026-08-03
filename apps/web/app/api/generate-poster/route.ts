// Server-side missing poster / social tile generation — Satori (JSX → SVG)
// + sharp (SVG → PNG). Replaces the prototype's client-side html2canvas.
//
// POST /api/generate-poster  { token, format, lastSeenArea, lastSeenDate,
//        lookFor, photoDataUri, preview }   — photoDataUri overrides the profile
//        photo. POST-only by design: lastSeenArea/lookFor describe a missing
//        pet's location and must not travel in a query string, where the
//        platform's access logs would capture them.

import { readFile } from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import satori from "satori";
import sharp from "sharp";
import { computeAge } from "@quirksandall/shared";
import { FORMATS, renderTemplate, type PosterData, type PosterFormat } from "../../../lib/poster/templates";
import { checkRateLimit, clientIp } from "../../lib/rateLimit";
import { sanitizeFreeText, isValidImageDataUri, sanitizeHeaderFilenameComponent } from "../../../lib/inputSanitize";

const MAX_AREA_LEN = 200;
const MAX_DATE_LEN = 40;
const MAX_LOOKFOR_LEN = 400;

export const runtime = "nodejs";

let fontCache: { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[] | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), "assets", "fonts");
  const [tanker, satoshi, satoshiBold] = await Promise.all([
    readFile(path.join(dir, "Tanker-Regular.ttf")),
    readFile(path.join(dir, "Satoshi-Regular.ttf")),
    readFile(path.join(dir, "Satoshi-Bold.ttf")),
  ]);
  fontCache = [
    { name: "Tanker", data: tanker, weight: 400, style: "normal" },
    { name: "Satoshi", data: satoshi, weight: 400, style: "normal" },
    { name: "Satoshi", data: satoshiBold, weight: 700, style: "normal" },
  ];
  return fontCache;
}

// pet.photo_url is owner-writable (any authenticated owner can PATCH their own
// pet row directly via PostgREST, bypassing uploadPetPhoto's normal flow), and
// this function does a server-side fetch of it — so it must be pinned to the
// one host that URL is ever legitimately on (this project's own Supabase
// Storage), or it's an open SSRF proxy for internal/arbitrary hosts.
function isTrustedPhotoUrl(url: string): boolean {
  try {
    const target = new URL(url);
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
    return target.protocol === "https:" && target.host === supabaseHost;
  } catch {
    return false;
  }
}

async function photoToDataUri(url: string): Promise<string | null> {
  if (!isTrustedPhotoUrl(url)) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return reencodePhoto(buf);
  } catch {
    return null;
  }
}

// Normalise + bound size. Cap at 2500 so the hero photo stays crisp at the
// 2× output scale (the poster photo band is ~2480px wide at 300dpi) without
// letting an unbounded upload blow up memory. Shared by both the trusted-URL
// fetch above and the client-supplied data URI path below — a client-sent
// photoDataUri is untrusted input and must be decoded/re-encoded through the
// same pipeline rather than passed straight into the template as raw bytes.
async function reencodePhoto(buf: Buffer): Promise<string | null> {
  try {
    const jpeg = await sharp(buf).rotate().resize(2500, 2500, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

// Client-supplied photoDataUri override: format/size-bounded first (rejects
// anything that isn't a small, well-formed image data URI), then still
// decoded and re-encoded through sharp rather than trusted verbatim — a
// syntactically valid data URI can still contain a hostile/malformed image
// payload, and re-encoding is what actually normalises it.
async function sanitizeClientPhotoDataUri(input: unknown): Promise<string | null> {
  if (!isValidImageDataUri(input)) return null;
  const comma = input.indexOf(",");
  if (comma < 0) return null;
  try {
    const buf = Buffer.from(input.slice(comma + 1), "base64");
    return await reencodePhoto(buf);
  } catch {
    return null;
  }
}

type Params = {
  token: string;
  format: PosterFormat;
  lastSeenArea: string;
  lastSeenDate: string;
  lookFor: string | null;
  photoDataUri: string | null;
  // On-screen thumbnail → render at 1× so it downloads fast. Save/share omits
  // this and gets the full 2× (300dpi) export.
  preview: boolean;
  ip: string;
};

async function generate(params: Params): Promise<Response> {
  const { token, format } = params;
  if (!token || typeof token !== "string") return Response.json({ error: "token required" }, { status: 400 });
  if (!(format in FORMATS)) {
    return Response.json({ error: "format must be poster | 1x1 | 4x5 | 9x16" }, { status: 400 });
  }

  // Free-text fields are attacker-controlled and unbounded by default —
  // cap length and strip control characters before they reach the
  // Satori-rendered template. null here just means "use empty", not reject.
  const lastSeenArea = sanitizeFreeText(params.lastSeenArea, MAX_AREA_LEN) ?? "";
  const lastSeenDate = sanitizeFreeText(params.lastSeenDate, MAX_DATE_LEN) ?? "";
  const lookForInput = params.lookFor == null ? null : sanitizeFreeText(params.lookFor, MAX_LOOKFOR_LEN);
  if (params.lookFor != null && lookForInput === null) {
    return Response.json({ error: "lookFor is too long" }, { status: 400 });
  }

  // Kick off the font read now so it overlaps the DB lookups and photo fetch
  // rather than blocking after them. (Cached after the first request.)
  const fontsPromise = loadFonts();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Satori+sharp rendering is CPU/memory-costly — cap requests per link+IP so
  // this can't be turned into a DoS/cost amplifier. Generous enough for the
  // preview-toggling UX (view switches re-request at 1×) noted above.
  const allowed = await checkRateLimit(supabase, "generate_poster", `${token}:${params.ip}`, 40, 10 * 60);
  if (!allowed) return Response.json({ error: "rate_limited" }, { status: 429 });

  const { data: link } = await supabase
    .from("share_links")
    .select("pet_id, revoked, expires_at")
    .eq("token", token)
    .single();

  if (!link || link.revoked) return Response.json({ error: "link not found" }, { status: 404 });
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return Response.json({ error: "link expired" }, { status: 404 });
  }

  const { data: pet } = await supabase
    .from("pets")
    .select(
      "name, breed, sex, dob, dob_is_estimated, weight, color_markings, microchip_number, photo_url, description_for_id, owners!inner(name, primary_phone)"
    )
    .eq("id", link.pet_id)
    .single();

  if (!pet) return Response.json({ error: "pet not found" }, { status: 404 });

  const owner = (pet as any).owners;
  // Watermark is tier-independent (free and paid alike); it renders on the
  // poster and 9:16 only, decided per-format inside the templates.

  const photoDataUri = params.photoDataUri != null
    ? await sanitizeClientPhotoDataUri(params.photoDataUri)
    : pet.photo_url ? await photoToDataUri(pet.photo_url) : null;

  if (!photoDataUri) {
    return Response.json(
      { error: `${pet.name} needs a photo for the poster. Add one in the profile first.` },
      { status: 422 }
    );
  }

  const data: PosterData = {
    name: pet.name,
    breed: pet.breed ?? "",
    sex: pet.sex ?? "",
    age: computeAge(pet.dob, pet.dob_is_estimated),
    weight: pet.weight ?? "",
    colorMarkings: pet.color_markings ?? "",
    microchip: pet.microchip_number ?? "",
    photoDataUri,
    descriptionForId: lookForInput ?? pet.description_for_id ?? "",
    ownerName: owner?.name ?? "",
    ownerPhone: owner?.primary_phone ?? "",
    lastSeenArea,
    lastSeenDate,
  };

  const { width, height } = FORMATS[format];
  const fonts = await fontsPromise;
  // Satori renders at the template's design coordinates; sharp then rasterises
  // the *vector* SVG at scale so text stays razor-sharp (a re-render, not a
  // bitmap upscale). Full export → 2× (poster 2480×3508 / 300dpi A4, tiles
  // 2160px); on-screen thumbnails → 1× so they download fast.
  const SCALE = params.preview ? 1 : 2;
  const svg = await satori(renderTemplate(format, data), { width, height, fonts });
  const png = await sharp(Buffer.from(svg))
    .resize(width * SCALE, height * SCALE)
    .png()
    .toBuffer();

  // pet.name is a DB value the owner controls — never interpolate it into an
  // HTTP header verbatim (quotes/CR/LF could inject additional header
  // content depending on runtime header serialization).
  const safeName = sanitizeHeaderFilenameComponent(pet.name.toLowerCase(), "pet");
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${safeName}-missing-${format}.png"`,
      // Thumbnails are re-requested as the user toggles views, so let the client
      // cache them briefly; the full export is always fresh.
      "Cache-Control": params.preview ? "private, max-age=300" : "no-store",
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    return await generate({
      token: typeof body.token === "string" ? body.token : "",
      format: (typeof body.format === "string" ? body.format : "poster") as PosterFormat,
      lastSeenArea: body.lastSeenArea ?? "",
      lastSeenDate: body.lastSeenDate ?? "",
      lookFor: body.lookFor ?? null,
      photoDataUri: body.photoDataUri ?? null,
      preview: body.preview === true,
      ip: clientIp(req),
    });
  } catch (err) {
    // Never leak internals (stack trace, file paths, satori/sharp error
    // detail) to the client — log server-side, return a generic message.
    console.error("generate-poster failed", err);
    return Response.json({ error: "Couldn't generate the poster. Please try again." }, { status: 500 });
  }
}
