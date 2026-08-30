/**
 * Are the security headers actually on the wire, and does the policy hold?
 *
 * Two things this checks that a unit test cannot. First, that the headers reach a
 * *static asset* as well as a document: the worker wraps everything, but "everything"
 * is a claim about routing rather than about code, and the failure it guards against
 * is the usual Cloudflare one — the asset handler answering before the worker is
 * invoked, which puts the policy on the HTML and nothing on the stylesheet and the
 * client bundle. Second, that nothing on the page is blocked by the policy it now
 * carries. A `Content-Security-Policy` cannot fail a build and cannot fail
 * `drive-site.mjs` unless what it blocks breaks a scene outright; a blocked font or a
 * blocked frame is a page that looks fine to whoever shipped it.
 *
 *   PREVIEW_PORT=4419 node scripts/security-headers.mjs
 *
 * Requires a current `npm run build`. Exit code is 1 on any missing header or any
 * violation report.
 *
 * It listens for `securitypolicyviolation` on the page and inside the choir frame
 * rather than reading the console, because Chromium reports a violation on the
 * document that owns the blocked element, and the one frame on this site is the one
 * place a `frame-src` or `media-src` mistake would land.
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const PORT = Number(process.env.PREVIEW_PORT ?? 4319);
const BASE = `http://localhost:${PORT}`;

const REQUIRED = [
  "content-security-policy",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
  "strict-transport-security",
];

let failures = 0;
const ok = (message) => console.log(`  ok    ${message}`);
const bad = (message) => {
  failures += 1;
  console.log(`  FAIL  ${message}`);
};

async function startServer() {
  const child = spawn(
    process.execPath,
    [path.join(root, "node_modules", "vite", "bin", "vite.js"), "preview", "--port", String(PORT), "--strictPort"],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
  );
  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      const response = await fetch(BASE, { redirect: "manual" });
      if (response.status < 500) return child;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) {
      child.kill();
      throw new Error(`preview server never answered on ${BASE}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

/** The hashed client bundle, read off the page rather than guessed. */
async function firstAssetUrl() {
  const html = await (await fetch(BASE)).text();
  const match = html.match(/["'](\/assets\/[^"']+\.(?:js|css))["']/);
  return match ? `${BASE}${match[1]}` : null;
}

const server = await startServer();

try {
  for (const [label, url] of [
    ["/ (document)", BASE],
    ["/legal (document)", `${BASE}/legal`],
    ["/assets/… (static)", await firstAssetUrl()],
    ["/demos/choir/index.html (framed document)", `${BASE}/demos/choir/index.html`],
    ["/fun/clip-01.mp4 (media)", `${BASE}/fun/clip-01.mp4`],
  ]) {
    if (!url) {
      bad(`${label}: no such URL on the page`);
      continue;
    }
    const response = await fetch(url);
    const missing = REQUIRED.filter((name) => !response.headers.get(name));
    if (missing.length) bad(`${label} is missing ${missing.join(", ")}`);
    else ok(`${label} carries all ${REQUIRED.length} headers`);
  }

  /* The two values that are deliberately not the usual ones, pinned here because
     "tightened it to the recommended value" is exactly how they get broken. */
  const headers = (await fetch(BASE)).headers;
  const csp = headers.get("content-security-policy") ?? "";
  if (!csp.includes("frame-ancestors 'self'")) {
    bad("frame-ancestors is not 'self'; the choir pod frames a same-origin document");
  } else ok("frame-ancestors 'self' keeps the choir frame legal");
  if ((headers.get("x-frame-options") ?? "").toUpperCase() !== "SAMEORIGIN") {
    bad("X-Frame-Options is not SAMEORIGIN; DENY blocks same-origin framing too");
  } else ok("X-Frame-Options SAMEORIGIN");
  if (!(headers.get("permissions-policy") ?? "").includes("microphone=(self)")) {
    bad("microphone is not (self); the vendored choir app listens to you sing");
  } else ok("Permissions-Policy leaves the microphone to this origin");

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const violations = [];
  await page.exposeFunction("__cspViolation", (entry) => violations.push(entry));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      window.__cspViolation?.({
        where: location.pathname,
        directive: event.effectiveDirective || event.violatedDirective,
        blocked: String(event.blockedURI).slice(0, 120),
      });
    });
  });

  for (const route of ["/", "/legal", "/legal/totem", "/legal/totem/privacy"]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "load" });
    await page.waitForTimeout(1200);
  }

  /* And the choir pod, which is the only frame and the only microphone on the site.
     Scrolled to and engaged, because the frame does not mount until it is on screen. */
  await page.goto(BASE, { waitUntil: "load" });
  await page.locator("#choir-practice").scrollIntoViewIfNeeded();
  try {
    // Waited for rather than slept past: the frame is a lazy chunk, then 1.6 MB of
    // scores, and a fixed pause is a check that reports the CI machine's mood.
    await page.frameLocator(".choir-frame").locator("header, h1").first().waitFor({ timeout: 45_000 });
    ok("the choir frame renders inside the policy");
  } catch {
    bad("the choir frame rendered nothing; frame-src or frame-ancestors is blocking it");
  }

  await page.waitForTimeout(1500);
  await browser.close();

  if (violations.length === 0) ok("no CSP violation reported on any page");
  else {
    for (const violation of violations.slice(0, 20)) {
      bad(`CSP blocked ${violation.directive} on ${violation.where}: ${violation.blocked}`);
    }
  }
} finally {
  server.kill();
}

console.log(failures === 0 ? "\nsecurity headers: clean" : `\nsecurity headers: ${failures} problem(s)`);
process.exit(failures === 0 ? 0 : 1);
