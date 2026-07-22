// Server-side missing poster / social tile generation — Satori (JSX → SVG)
// + sharp (SVG → PNG). Replaces the prototype's client-side html2canvas.
//
// GET  /api/generate-poster?token=...&format=poster|1x1|4x5|9x16
//        &lastSeenArea=...&lastSeenDate=YYYY-MM-DD&lookFor=...
// POST /api/generate-poster  { token, format, lastSeenArea, lastSeenDate,
//        lookFor, photoDataUri }   — photoDataUri overrides the profile photo

import { readFile } from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import satori from "satori";
import sharp from "sharp";
import { computeAge } from "@quirksandall/shared";
import { FORMATS, renderTemplate, type PosterData, type PosterFormat } from "../../../lib/poster/templates";

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

async function photoToDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // Normalise + bound size so Satori stays fast and memory stays sane
    const jpeg = await sharp(buf).rotate().resize(1400, 1400, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
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
};

async function generate(params: Params): Promise<Response> {
  const { token, format } = params;
  if (!token) return Response.json({ error: "token required" }, { status: 400 });
  if (!(format in FORMATS)) {
    return Response.json({ error: "format must be poster | 1x1 | 4x5 | 9x16" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

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

  const photoDataUri =
    params.photoDataUri ?? (pet.photo_url ? await photoToDataUri(pet.photo_url) : null);

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
    descriptionForId: params.lookFor ?? pet.description_for_id ?? "",
    ownerName: owner?.name ?? "",
    ownerPhone: owner?.primary_phone ?? "",
    lastSeenArea: params.lastSeenArea,
    lastSeenDate: params.lastSeenDate,
  };

  const { width, height } = FORMATS[format];
  const fonts = await loadFonts();
  const svg = await satori(renderTemplate(format, data), { width, height, fonts });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${pet.name.toLowerCase()}-missing-${format}.png"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  return generate({
    token: url.searchParams.get("token") ?? "",
    format: (url.searchParams.get("format") ?? "poster") as PosterFormat,
    lastSeenArea: url.searchParams.get("lastSeenArea") ?? "",
    lastSeenDate: url.searchParams.get("lastSeenDate") ?? "",
    lookFor: url.searchParams.get("lookFor"),
    photoDataUri: null,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return generate({
    token: body.token ?? "",
    format: (body.format ?? "poster") as PosterFormat,
    lastSeenArea: body.lastSeenArea ?? "",
    lastSeenDate: body.lastSeenDate ?? "",
    lookFor: body.lookFor ?? null,
    photoDataUri: body.photoDataUri ?? null,
  });
}
