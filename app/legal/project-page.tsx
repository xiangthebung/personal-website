/**
 * The level between `/legal` and a document: everything one project publishes.
 *
 * This existed as a gap rather than as a page. `/legal` listed every document and
 * each document answered at `/legal/<project>/<privacy|terms>`, but the segment in
 * between 404'd — and that is not a tidiness complaint, because other repositories
 * in this collection had already started printing it. GRT Next Bus's README records
 * its published base as `/legal/grt-next-bus`, with "`privacy` and `terms` under
 * that base", and a test in that repository pins the extension popup's two
 * in-product links to it. A URL a shipped product points at is a URL that has to
 * resolve.
 *
 * The list is derived, never written twice: `policiesFor` is the same function the
 * project heading on the home page uses to decide which policy links to print, so a
 * document cannot appear in one place and be missing from the other. A project with
 * nothing published is a 404 rather than an empty page, because an empty page is a
 * claim that there is nothing to disclose, and this component has no way to know
 * that.
 *
 * Same chassis as the rest of `/legal` — one column, no ambience, no motion — and
 * two ways back out, because somebody arriving here from a store listing or an
 * extension popup has never seen the rest of the site.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { policiesFor } from "./policies";

export function projectPolicyMetadata(projectId: string): Metadata {
  const documents = policiesFor(projectId);
  if (documents.length === 0) return { title: "Legal · Xiang Li" };

  const name = documents[0].projectName;
  return {
    title: `${name} legal · Xiang Li`,
    description: `Privacy${
      documents.some((document) => document.kind === "terms") ? " and terms" : ""
    } for ${name}.`,
  };
}

export function ProjectPolicyIndex({ projectId }: { projectId: string }) {
  const documents = policiesFor(projectId);
  if (documents.length === 0) notFound();

  const name = documents[0].projectName;
  const hasTerms = documents.some((document) => document.kind === "terms");

  return (
    <article className="legal">
      <header className="legal-head">
        <p className="legal-eyebrow">
          <Link href="/">Xiang Li</Link>
          <span aria-hidden="true">/</span>
          <Link href="/legal">Legal</Link>
          <span aria-hidden="true">/</span>
          <span>{name}</span>
        </p>
        <h1>{name}</h1>
        <p className="legal-effective">
          {hasTerms
            ? `Everything ${name} publishes: what it does with your data, and what you are buying if you pay for it.`
            : `What ${name} does with your data, and what it does not do with it.`}
        </p>
      </header>

      <div className="legal-body">
        <ul className="legal-index">
          <li>
            {/* No group heading. On `/legal` the heading is the project name,
                which here is already the title of the page. */}
            <ul>
              {documents.map((document) => (
                <li key={document.slug}>
                  <Link href={`/legal/${document.slug}`}>{document.label}</Link>
                  <span>{document.summary}</span>
                </li>
              ))}
            </ul>
          </li>
        </ul>

        <h2>Contact</h2>
        <p>
          Anything at all, including deletion requests:{" "}
          <a href="mailto:xiangli3625@gmail.com">xiangli3625@gmail.com</a>.
        </p>
      </div>

      <footer className="legal-foot">
        <p>
          <Link href="/legal">Every policy and every set of terms</Link>
        </p>
        <p>
          <Link href={`/#${projectId}`}>Back to {name}</Link>
        </p>
      </footer>
    </article>
  );
}
