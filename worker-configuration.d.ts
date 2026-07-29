/**
 * Cloudflare Workers runtime types and binding declarations.
 *
 * `worker/index.ts` and `db/index.ts` use runtime globals (`Fetcher`,
 * `D1Database`) and the built-in `cloudflare:workers` module, none of which the
 * DOM lib knows about. Without this file `tsc --noEmit` reported errors on files
 * nobody had touched, which made the typecheck useless as a signal — so it went
 * unrun, and real type errors in real code had nowhere to show up.
 *
 * A triple-slash reference is additive: it does not replace the default `types`
 * resolution the way setting `compilerOptions.types` would.
 */

/// <reference types="@cloudflare/workers-types" />

/**
 * Bindings reachable through `import { env } from "cloudflare:workers"`.
 *
 * `env` is typed as `Cloudflare.Env`, which the runtime types declare empty and
 * invite each project to extend — this is that extension. (`wrangler types` can
 * generate it instead, but that needs a `wrangler.jsonc`, and this starter
 * deliberately does not have one.)
 *
 * Every binding is optional on purpose. `.openai/hosting.json` currently declares
 * `"d1": null` and `"r2": null`, so nothing is injected, and `db/getDb()` already
 * handles that by throwing a readable error rather than dereferencing `undefined`.
 * Typing them as optional is what makes that guard meaningful instead of dead
 * code, and it means adding a binding later is a one-line change here.
 */
declare namespace Cloudflare {
  interface Env {
    /** Static asset fetcher, provided by the platform. */
    ASSETS?: Fetcher;
    /** Cloudflare D1. Present only when `hosting.json` names a `d1` binding. */
    DB?: D1Database;
    /** Cloudflare R2. Present only when `hosting.json` names an `r2` binding. */
    BUCKET?: R2Bucket;
  }
}
