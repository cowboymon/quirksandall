import { NextRequest, NextResponse } from "next/server";
import { unlockCookieName } from "../../lib/unlock";

export const runtime = "nodejs";

// "Lock again on this device" (#87). Clears the persisted-unlock cookie so the
// PIN is required next time — for shared or borrowed devices. The cookie is
// httpOnly, so only the server can clear it.
export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({}));
  const res = NextResponse.json({ success: true });
  if (token) {
    res.cookies.set({ name: unlockCookieName(token), value: "", path: "/", maxAge: 0 });
  }
  return res;
}
