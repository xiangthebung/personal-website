import type { Metadata } from "next";
import Link from "next/link";
import { policies } from "./policies";

export const metadata: Metadata = {
  title: "Legal · Xiang Li",
  description:
    "Privacy policies and terms of sale for the extensions listed on this site.",
};

/**
 * The index.
 *
 * Seven of the ten projects need one of these. Six are Chrome extensions, and an
 * extension that reads your mail, your requests, your location or the page in front
 * of you does not get listed until it has published what it does with them. The
 * seventh is Totem, which asks a phone for its microphone, and Apple and Google ask
 * the same question the Chrome Web Store does. Three of the seven also take money,
 * so they publish terms beside the policy.
 *
 * The other three collect nothing and have nothing to disclose, which is worth
 * saying here rather than leaving as a gap someone has to interpret.
 *
 * Each project name below is a link one level down rather than back to the home
 * page: `/legal/<project>` is a real page now, because other repositories in this
 * collection print that address in their own product. See `project-page.tsx`.
 */
export default function LegalIndex() {
  const groups = [...new Set(policies.map((policy) => policy.project))].map((project) => ({
    project,
    name: policies.find((policy) => policy.project === project)!.projectName,
    items: policies.filter((policy) => policy.project === project),
  }));

  return (
    <article className="legal">
      <header className="legal-head">
        <p className="legal-eyebrow">
          <Link href="/">Xiang Li</Link>
          <span aria-hidden="true">/</span>
          <span>Legal</span>
        </p>
        <h1>Legal</h1>
        <p className="legal-effective">
          Privacy policies and terms for the things on this site that need them.
        </p>
      </header>

      <div className="legal-body">
        <ul className="legal-index">
          {groups.map((group) => (
            <li key={group.project}>
              <h2>
                <Link href={`/legal/${group.project}`}>{group.name}</Link>
              </h2>
              <ul>
                {group.items.map((policy) => (
                  <li key={policy.slug}>
                    <Link href={`/legal/${policy.slug}`}>{policy.label}</Link>
                    <span>{policy.summary}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <h2>Everything else</h2>
        <p>
          N-Back, PDF Explainer and Choir Practice have no policy here because they
          have nothing to disclose. They store what you do in your own browser,
          take no payment, and run no analytics. PDF Explainer talks to Google&apos;s
          Gemini API with a key you supply, so the terms that apply to that traffic
          are Google&apos;s, not mine; the key is kept in session storage on your
          device and is never logged server-side.
        </p>

        <h2>Contact</h2>
        <p>
          Anything at all, including deletion requests:{" "}
          <a href="mailto:xiangli3625@gmail.com">xiangli3625@gmail.com</a>.
        </p>
      </div>

      <footer className="legal-foot">
        <p>
          <Link href="/">Back to the projects</Link>
        </p>
      </footer>
    </article>
  );
}
