/**
 * Generates responsive AVIF derivatives for every image the site renders, and
 * writes app/media-manifest.ts describing them.
 *
 * The originals stay untouched and remain the <img src> fallback; the manifest
 * supplies the AVIF srcset, the intrinsic size (so nothing reflows while media
 * decodes) and an average colour used as a placeholder tint.
 *
 * Run after adding or replacing anything in public/fun:
 *   npm run media
 *
 * Output is idempotent: a derivative is only re-encoded when its source is
 * newer, so repeat runs are cheap.
 */
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const publicDir = path.join(root, "public");
const manifestPath = path.join(root, "app", "media-manifest.ts");

const SOURCE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);
const MEASURE_ONLY_EXTENSIONS = new Set([".avif", ".webp"]);

/**
 * Widths are sized to each surface's largest CSS box at 2x. Gallery media caps
 * at a 520px card; the hero face is full-bleed.
 *
 * There was a third surface here, `projects/`, and it is worth recording why it
 * went rather than leaving a shorter list. It was the old design: a screenshot per
 * project, at three widths, on a 740px card. The sections mount the software itself
 * now, so nothing on this site has rendered one of those files in a long time — but
 * `public/projects/` and its derivatives stayed, 71 originals and 118 AVIFs, 19MB,
 * uploaded on every deploy and publicly reachable, several of them still filed under
 * Decaf's old name. This pipeline is what kept them looking alive: it measured them,
 * re-encoded them and wrote them into the manifest every run, so they had an entry in
 * a generated file and no reader anywhere. A surface with no consumer is not a surface,
 * and a plan entry for one is a standing invitation to put the files back.
 */
const WIDTH_PLAN = [
  { prefix: "fun/", widths: [420, 640, 1040] },
  { prefix: "hero-face", widths: [768, 1200, 1600, 2200] },
];

/**
 * Images the page never renders as an `<img>`, so they get no derivatives and no
 * manifest entry.
 *
 * The manifest exists to hand a `srcset`, an intrinsic size and a placeholder tint to
 * an element that is going to display one of these files. The social preview is read
 * by a crawler out of a `<meta>` tag; the icons are read by the browser out of
 * `<link rel="icon">`. Neither is ever laid out, so neither has anything to reflow and
 * neither needs a 32px AVIF of itself. They were not on this list, they were not in the
 * manifest either — nobody had run this since they were added — and the first run
 * after that produced four derivatives no markup can reach.
 *
 * Being on this list is not a hiding place, and the entries that used to be here are
 * the warning: `og.png`, `og-v2.png` and `hero-face.png` sat in `public/` referenced by
 * nothing, skipped by this pipeline, absent from the manifest, and uploaded on every
 * deploy — 10.9 MiB between them. They have been deleted. Everything left here is
 * something a specific line of `app/layout.tsx` names.
 */
const SKIP = new Set([
  "og-xiang-li.png",
  "apple-touch-icon.png",
  "favicon-32.png",
  "favicon-192.png",
  "favicon-512.png",
]);

async function collect(dir, base = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (entry.name === "derived") continue;
      files.push(...(await collect(path.join(dir, entry.name), relative)));
      continue;
    }
    if (SKIP.has(relative)) continue;

    const extension = path.extname(entry.name).toLowerCase();
    if (
      SOURCE_EXTENSIONS.has(extension) ||
      MEASURE_ONLY_EXTENSIONS.has(extension)
    ) {
      files.push(relative);
    }
  }

  return files.sort();
}

function widthsFor(relative) {
  const plan = WIDTH_PLAN.find((entry) => relative.startsWith(entry.prefix));
  return plan ? plan.widths : [640, 1024];
}

async function isStale(source, target) {
  try {
    const [sourceStat, targetStat] = await Promise.all([
      stat(source),
      stat(target),
    ]);
    return sourceStat.mtimeMs > targetStat.mtimeMs;
  } catch {
    return true;
  }
}

function toHex(channel) {
  return Math.max(0, Math.min(255, Math.round(channel)))
    .toString(16)
    .padStart(2, "0");
}

async function averageColour(image) {
  const { data, info } = await image
    .clone()
    .resize(8, 8, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  let red = 0;
  let green = 0;
  let blue = 0;
  const pixels = data.length / channels;

  for (let index = 0; index < data.length; index += channels) {
    red += data[index];
    green += data[index + 1];
    blue += data[index + 2];
  }

  return `#${toHex(red / pixels)}${toHex(green / pixels)}${toHex(blue / pixels)}`;
}

async function main() {
  const relatives = await collect(publicDir);
  const manifest = {};
  let encoded = 0;
  let reused = 0;

  for (const relative of relatives) {
    const source = path.join(publicDir, relative);
    const image = sharp(source, { limitInputPixels: false });
    const metadata = await image.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (!width || !height) continue;

    const entry = {
      width,
      height,
      tint: await averageColour(image),
      avif: "",
    };

    const extension = path.extname(relative).toLowerCase();
    if (SOURCE_EXTENSIONS.has(extension)) {
      const targets = [...new Set(widthsFor(relative).filter((w) => w < width)), width]
        .sort((a, b) => a - b);
      const sources = [];

      for (const target of targets) {
        const withoutExtension = relative.slice(0, -extension.length);
        const outputRelative = `derived/${withoutExtension}-${target}.avif`;
        const output = path.join(publicDir, outputRelative);

        if (await isStale(source, output)) {
          await mkdir(path.dirname(output), { recursive: true });
          await image
            .clone()
            .resize({ width: target, withoutEnlargement: true })
            .avif({ quality: 52, effort: 6 })
            .toFile(output);
          encoded += 1;
        } else {
          reused += 1;
        }

        sources.push(`/${outputRelative} ${target}w`);
      }

      entry.avif = sources.join(", ");
    }

    manifest[`/${relative}`] = entry;
  }

  const body = Object.entries(manifest)
    .map(([key, value]) => {
      const avif = value.avif ? `\n    avif: ${JSON.stringify(value.avif)},` : "";
      return `  ${JSON.stringify(key)}: {\n    width: ${value.width},\n    height: ${value.height},\n    tint: ${JSON.stringify(value.tint)},${avif}\n  },`;
    })
    .join("\n");

  const file = `/**
 * Generated by scripts/build-media.mjs. Do not edit by hand.
 *
 * Every image under public/ that the page renders, with its intrinsic size, an
 * average colour for placeholder tinting, and the AVIF srcset built from
 * public/derived.
 */

export type MediaAsset = {
  width: number;
  height: number;
  /** Average colour, shown behind the image while it decodes. */
  tint: string;
  /** AVIF candidates, narrowest first. Absent for sources that are already AVIF. */
  avif?: string;
};

export const mediaManifest: Record<string, MediaAsset> = {
${body}
};

export function mediaAsset(src: string): MediaAsset | undefined {
  return mediaManifest[src];
}
`;

  await writeFile(manifestPath, file, "utf8");
  console.log(
    `media: ${Object.keys(manifest).length} sources, ${encoded} encoded, ${reused} reused`,
  );
}

await main();
