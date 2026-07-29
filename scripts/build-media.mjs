/**
 * Generates responsive AVIF derivatives for every image the site renders, and
 * writes app/media-manifest.ts describing them.
 *
 * The originals stay untouched and remain the <img src> fallback; the manifest
 * supplies the AVIF srcset, the intrinsic size (so nothing reflows while media
 * decodes) and an average colour used as a placeholder tint.
 *
 * Run after adding or replacing anything in public/fun or public/projects:
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
 * Widths are sized to each surface's largest CSS box at 2x. Project
 * screenshots cap at a 740px card, gallery media at a 520px card.
 */
const WIDTH_PLAN = [
  { prefix: "fun/", widths: [420, 640, 1040] },
  { prefix: "projects/", widths: [640, 1024, 1480] },
  { prefix: "hero-face", widths: [768, 1200, 1600, 2200] },
];

/**
 * The social preview image is never rendered in the page, so it gets no
 * derivatives and no manifest entry.
 *
 * This used to also list `og.png`, `og-v2.png` and `hero-face.png`. Being on this
 * list is what let them sit in `public/` unreferenced by anything and unnoticed:
 * skipped by the media pipeline, absent from the manifest, and still uploaded on
 * every deploy — 10.9 MiB between them. They have been deleted.
 */
const SKIP = new Set(["og-xiang-li.png"]);

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
