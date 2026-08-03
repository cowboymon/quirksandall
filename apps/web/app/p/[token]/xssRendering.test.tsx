import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isSafeHttpsUrl, sanitizeTelValue } from "@quirksandall/shared";

// This app's actual XSS defense is React's JSX auto-escaping — every DB
// -sourced field on the recipient page (RecipientView.tsx) is rendered via
// plain `{value}` interpolation, never dangerouslySetInnerHTML or a manual
// DOM write. These tests prove that defense actually holds for the exact
// rendering pattern used there (a component rendering untrusted text as a
// child), using react-dom/server so no DOM/jsdom environment is needed —
// renderToStaticMarkup produces the real HTML string a browser would
// receive, so this is testing the actual output, not a simulation of it.
//
// Uses React.createElement rather than JSX syntax so this file needs no
// JSX-transform plugin wired into the root Vitest config beyond what's
// already there — the escaping behavior under test is identical either way
// (JSX children compile to createElement calls), this just avoids adding
// build-pipeline surface for one test file.

// Mirrors the shape of the real rendering: a pet name, a note field, and a
// contact name — all attacker-controllable DB text rendered as children.
function ProfileCard({ name, note, contactName }: { name: string; note: string; contactName: string }) {
  return createElement(
    "div",
    null,
    createElement("h1", null, `${name}'s Cheat Sheet`),
    createElement("p", null, note),
    createElement("span", null, contactName),
  );
}

const XSS_PAYLOADS = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  "<svg onload=alert(1)>",
  "\"><script>alert(document.cookie)</script>",
  "<iframe src=javascript:alert(1)></iframe>",
  "</p><script>alert(1)</script><p>",
];

describe("stored XSS — child-text interpolation escapes attacker-controlled DB fields", () => {
  it.each(XSS_PAYLOADS)("payload %j never appears as executable markup in the rendered output", (payload) => {
    const html = renderToStaticMarkup(
      createElement(ProfileCard, { name: payload, note: payload, contactName: "Normal Name" }),
    );

    // The literal, unescaped payload string must never appear in the output —
    // if it did, that's the raw tag landing in the DOM as markup.
    expect(html).not.toContain(payload);
    // No real (unescaped) <script>, <img>, <svg>, or <iframe> tag exists in
    // the output — only their HTML-entity-escaped text form (&lt;script&gt;
    // etc). The word "onerror"/"onload" appearing as inert escaped text is
    // fine and expected; what matters is that it's never inside a live tag.
    expect(html).not.toMatch(/<script[\s>]/i);
    expect(html).not.toMatch(/<iframe[\s>]/i);
    expect(html).not.toMatch(/<img[\s>]/i);
    expect(html).not.toMatch(/<svg[\s>]/i);
    // The escaped form IS present as inert text (proves the content still
    // renders, just safely — this isn't stripping the field, it's escaping it).
    expect(html).toContain("&lt;");
  });

  it("a normal, legitimate name/note renders unescaped as expected (no false-positive stripping)", () => {
    const html = renderToStaticMarkup(
      createElement(ProfileCard, { name: "Olive", note: "Loves belly rubs", contactName: "Sam" }),
    );
    expect(html).toContain("Olive");
    expect(html).toContain("Loves belly rubs");
    expect(html).toContain("Sam");
  });
});

// DOM-based XSS: the two places DB text becomes a *browser-interpreted*
// attribute (href/src) rather than a text node — these can't rely on JSX
// escaping alone (an href IS meant to contain a URL), so RecipientView.tsx
// validates them with isSafeHttpsUrl/sanitizeTelValue before use. Proving
// those validators actually reject the dangerous schemes is the DOM-based
// -XSS test for this app, since it's the one place a "safe as text" field
// becomes "interpreted as a navigable resource."
describe("DOM-based XSS — href/src validation before an attacker-controlled URL reaches the DOM", () => {
  it("rejects every scheme that would execute if placed in an <img src> or <a href>", () => {
    const dangerous = [
      "javascript:alert(document.cookie)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "  javascript:alert(1)",
    ];
    for (const value of dangerous) {
      expect(isSafeHttpsUrl(value)).toBe(false);
    }
  });

  it("a tel: value can't smuggle an event-handler/markup breakout", () => {
    const sanitized = sanitizeTelValue('123" onmouseover="alert(1)');
    expect(sanitized).not.toMatch(/["<>=]/);
  });
});
