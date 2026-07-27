import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the portfolio and project scroll guidance", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Xiang Li<\/title>/i);
  assert.match(html, /GRT Next Bus/);
  assert.match(html, /Drag sideways/);
  assert.match(html, /Shift \+ scroll/);
  assert.match(html, /project-nav-button/);
  assert.match(html, /left and right arrow keys/);
  assert.match(html, /hero-face-1600\.jpg/);
  assert.match(html, /preload="none"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("keeps project motion accessible and outside React render state", async () => {
  const [page, rail, css, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/project-rail.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /^"use client"/);
  assert.match(rail, /^"use client"/);
  assert.match(rail, /event\.shiftKey/);
  assert.match(rail, /Math\.min\(maxScroll, scroller\.scrollLeft/);
  assert.match(rail, /onPointerDown=\{handlePointerDown\}/);
  assert.match(rail, /onPointerMove=\{handlePointerMove\}/);
  assert.match(rail, /event\.key === "ArrowRight"/);
  assert.match(rail, /requestAnimationFrame/);
  assert.match(rail, /ResizeObserver/);
  assert.match(rail, /IntersectionObserver/);
  // Motion is unconditional by design: every visitor gets the full animation set,
  // so the rail must not gate any of it behind a motion preference.
  assert.doesNotMatch(rail, /prefers-reduced-motion/);
  assert.match(rail, /style\.setProperty\("--rail-x"/);
  assert.doesNotMatch(rail, /useState/);
  assert.doesNotMatch(rail, /addEventListener\("wheel"/);

  assert.match(css, /overscroll-behavior-x:\s*contain/);
  assert.match(css, /overscroll-behavior-y:\s*auto/);
  assert.match(css, /html\s*\{[\s\S]*overflow-x:\s*hidden/);
  assert.match(css, /body\s*\{[\s\S]*overflow-x:\s*hidden/);
  assert.match(css, /cursor:\s*grab/);
  assert.match(css, /touch-action:\s*pan-y/);
  assert.match(css, /\.project-nav-button:disabled/);
  assert.match(css, /\.project \+ \.project\s*\{[\s\S]*margin-top/);
  assert.match(css, /scaleX\(var\(--project-progress\)\)/);
  assert.match(css, /\.project:not\(\.is-active\) > \.portrait-popout/);
  assert.match(css, /content-visibility:\s*auto/);
  assert.match(layout, /title: "Xiang Li"/);
  assert.doesNotMatch(layout, /Six practical tools built with AI|Some tools I made/);
  assert.doesNotMatch(layout, /codex-preview|_sites-preview/);
});
