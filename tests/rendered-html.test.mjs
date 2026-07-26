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
  assert.match(html, /<title>Xiang Li — Projects<\/title>/i);
  assert.match(html, /GRT Next Bus/);
  assert.match(html, /Drag sideways/);
  assert.match(html, /Shift \+ scroll/);
  assert.match(html, /project-nav-button/);
  assert.match(html, /left and right arrow keys/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("keeps project scrolling accessible without hijacking vertical page scroll", async () => {
  const [page, css, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /event\.shiftKey/);
  assert.match(page, /onPointerDown=\{handlePointerDown\}/);
  assert.match(page, /onPointerMove=\{handlePointerMove\}/);
  assert.match(page, /event\.key === "ArrowRight"/);
  assert.match(page, /disabled=\{!canScrollBack\}/);
  assert.match(page, /disabled=\{!canScrollForward\}/);
  assert.doesNotMatch(page, /addEventListener\("wheel"/);
  assert.match(css, /overscroll-behavior-x:\s*contain/);
  assert.match(css, /overscroll-behavior-y:\s*auto/);
  assert.match(css, /cursor:\s*grab/);
  assert.match(css, /touch-action:\s*pan-y/);
  assert.match(css, /\.project-nav-button:disabled/);
  assert.match(layout, /title: "Xiang Li — Projects"/);
  assert.doesNotMatch(layout, /codex-preview|_sites-preview/);
});
