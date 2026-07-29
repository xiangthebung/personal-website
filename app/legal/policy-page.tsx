/**
 * The frame every policy page shares.
 *
 * These pages exist because the Chrome Web Store requires a privacy policy at a
 * URL, and because anyone who has just handed an extension their location is
 * entitled to read what happens next without cloning a repository. So the page is
 * built for reading rather than for the site's tone: one column, real measure,
 * no ambience, no animation. The only flourishes are a way back to the project
 * and a link to the original file, so it can be read next to the code it
 * describes.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { Markdown, parseBlocks } from "./markdown";
import { policiesFor, policyBySlug, type Policy } from "./policies";

/** `Effective: July 28, 2026` from the top of the document. */
function effectiveDate(markdown: string): string | undefined {
  return /^Effective:\s*(.+)$/m.exec(markdown)?.[1]?.trim();
}

/** The first paragraph, used as the meta description. */
function firstParagraph(markdown: string): string | undefined {
  const blocks = parseBlocks(markdown);
  const paragraph = blocks.find(
    (block) => block.kind === "paragraph" && !block.text.startsWith("Effective:"),
  );
  return paragraph?.kind === "paragraph" ? paragraph.text : undefined;
}

export function policyMetadata(slug: string): Metadata {
  const policy = policyBySlug(slug);
  const description = firstParagraph(policy.markdown);
  return {
    title: `${policy.label} · Xiang Li`,
    ...(description ? { description } : {}),
  };
}

export function PolicyPage({ slug }: { slug: string }) {
  const policy = policyBySlug(slug);
  const effective = effectiveDate(policy.markdown);
  const siblings = policiesFor(policy.project).filter((other) => other.slug !== policy.slug);

  return (
    <article className="legal">
      <header className="legal-head">
        <p className="legal-eyebrow">
          <Link href="/legal">Legal</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/#${policy.project}`}>{policy.projectName}</Link>
        </p>
        <h1>{policy.label}</h1>
        {effective ? (
          <p className="legal-effective">
            Effective <strong>{effective}</strong>
          </p>
        ) : null}
      </header>

      <div className="legal-body">
        {/* The H1 and the effective line are already in the header above. */}
        <Markdown source={stripFrontMatter(policy.markdown)} skipTitle />
      </div>

      <footer className="legal-foot">
        <p>
          This is a copy for reading. The original is versioned with the code it
          describes: <a href={policy.original}>{repoPath(policy)}</a>.
        </p>
        {siblings.length > 0 ? (
          <p>
            Also for {policy.projectName}:{" "}
            {siblings.map((other, index) => (
              <span key={other.slug}>
                {index > 0 ? ", " : ""}
                <Link href={`/legal/${other.slug}`}>{other.label}</Link>
              </span>
            ))}
            .
          </p>
        ) : null}
        <p>
          <Link href={`/#${policy.project}`}>Back to {policy.projectName}</Link>
        </p>
      </footer>
    </article>
  );
}

/** Drops the `Effective:` line, which the header renders instead. */
function stripFrontMatter(markdown: string): string {
  return markdown.replace(/^Effective:.*$/m, "");
}

/** `repo/FILE.md`, from the blob URL. */
function repoPath(policy: Policy): string {
  const parts = policy.original.split("/");
  const file = parts[parts.length - 1];
  const repo = parts[4] ?? "repository";
  return `${repo}/${file}`;
}
