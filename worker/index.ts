/**
 * Cloudflare Worker entry point for the vinext-starter template.
 *
 * Everything that leaves here goes out through `withSecurityHeaders` — the rendered
 * pages, the optimised images and the static assets alike. See
 * `worker/security-headers.ts` for what is set and, more usefully, for the two
 * headers whose obvious value would have broken the choir pod without failing
 * anything.
 */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { withSecurityHeaders } from "./security-headers";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return withSecurityHeaders(
        await handleImageOptimization(request, {
          fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
            return result.response();
          },
        }, allowedWidths),
      );
    }

    /* One wrapper for the whole surface. The framework handler answers the routes and
       falls through to `env.ASSETS` for everything under `/assets/`, `/demos/`,
       `/fun/` and the rest of `public/`, so wrapping here is what puts the policy on
       the stylesheet and the client bundle as well as on the document — and the
       stylesheet is frequently the first response a browser reads. */
    return withSecurityHeaders(await handler.fetch(request, env, ctx));
  },
};

export default worker;
