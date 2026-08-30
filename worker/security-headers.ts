/**
 * The headers every response leaves here with.
 *
 * The site sent none of these. Nothing about that was visible: a page with no
 * `X-Content-Type-Options` renders exactly like a page with one, which is why it
 * stayed true through every check this repository has.
 *
 * Three of them are decided by things this page actually does, and each of those
 * three has a version that would have looked correct and broken something quietly.
 * They are written out below rather than left as values to be admired.
 *
 * ── Framing ────────────────────────────────────────────────────────────────────
 * `X-Frame-Options: DENY` and `frame-ancestors 'none'` are the usual answer and are
 * both wrong here. Choir Practice is not a reconstruction; it is the application,
 * vendored into `public/demos/choir/` and mounted in an `<iframe>` by its own pod —
 * same origin, and therefore governed by this very header. Both of those values
 * forbid *all* framing, same-origin included, so either one would have left the one
 * section on this site that runs real software showing an empty box. `SAMEORIGIN`
 * and `frame-ancestors 'self'` refuse every other site and permit the one frame this
 * page draws.
 *
 * ── The microphone ─────────────────────────────────────────────────────────────
 * Same cause. `microphone=()` is what a portfolio should send, and this portfolio
 * embeds an app whose pitch guidance listens to you sing — the iframe carries
 * `allow="autoplay; microphone"` deliberately, and a top-level denial overrides an
 * iframe's `allow` rather than negotiating with it. So the permission is `(self)`:
 * this origin may ask, which covers the same-origin frame, and no third party can.
 * The camera and geolocation are denied outright, because nothing here has any use
 * for either and saying so is free.
 *
 * ── The script policy ──────────────────────────────────────────────────────────
 * `script-src 'self' 'unsafe-inline'`, and that is not laziness. The server render
 * ships the RSC payload as inline `<script>` blocks — 41 of them on the home page,
 * each one a fragment of the tree, their content different on every route and every
 * build. A hash list cannot describe them and vinext 0.0.50 exposes no nonce, so
 * `script-src 'self'` alone does not tighten this page, it turns hydration off: no
 * scenes, no dock, no gallery, and a build that passes.
 *
 * What is left is still worth sending. With `'unsafe-inline'` the policy no longer
 * stops an injected `<script>` — it does still stop that script from *loading*
 * anything, since no other origin is named anywhere in it. `object-src 'none'`
 * removes the plugin surface, `base-uri 'none'` removes the one-tag trick that
 * repoints every relative URL on the page, `form-action 'self'` means nothing can be
 * posted off-origin, and `connect-src 'self'` means nothing can be sent off-origin
 * either. That is defence in depth rather than a wall, and it is honest about which
 * it is. If vinext ever emits a nonce, the change is one line here.
 */

const CSP_DIRECTIVES: readonly string[] = [
  "default-src 'self'",
  // See "The script policy" above before tightening this.
  "script-src 'self' 'unsafe-inline'",
  /* `next/font` inlines a `@font-face` block, and the page sets custom properties
     through `style` attributes in a dozen places — the letter index on each hero
     letter, the tilt on each print, `--order` on every index row. `style-src`
     governs both, and there is no nonce for either. */
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  // The gallery's clips, and any object URL the vendored choir app makes.
  "media-src 'self' blob:",
  // The choir pod's iframe. Same origin, and nothing else is ever framed.
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  // 'self', not 'none' — see "Framing" above.
  "frame-ancestors 'self'",
];

export const CONTENT_SECURITY_POLICY = CSP_DIRECTIVES.join("; ");

/**
 * Set on every response this worker returns, HTML and asset alike.
 *
 * `Strict-Transport-Security` is here rather than on documents only because a
 * browser reads it from whatever response arrives first, and on a page that opens
 * with a stylesheet and a script that is often not the document. Two years, which is
 * the interval the header's own guidance settles on, and no `preload`: preloading is
 * a submission to a list that is difficult to leave, and that is a decision about a
 * domain rather than about a deploy.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "X-Content-Type-Options": "nosniff",
  /* `frame-ancestors` above is the real control; this is for anything that predates
     it. Both say the same thing: this site, and no other. */
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
};

/**
 * Copy a response so its headers can be added to.
 *
 * Responses that come back from the asset binding and from the framework handler
 * carry immutable headers, so there is nothing to set on the original. Passing the
 * response itself as the init argument keeps the status, the status text and
 * everything the platform put there — `Content-Type`, `ETag`, the immutable caching
 * on hashed assets — and only the names below are overwritten.
 */
export function withSecurityHeaders(response: Response): Response {
  const copy = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    copy.headers.set(name, value);
  }
  return copy;
}
