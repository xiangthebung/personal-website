/**
 * The published policies.
 *
 * The text is not written here. It is imported as a string from the copies in
 * `./policies/`, whose originals live in the project repositories — see the
 * README in that directory for why there are two copies and what keeps them
 * honest. This file is only the index: which policy belongs to which project,
 * what it is called, and where its original can be read.
 */

import decafPrivacy from "./policies/decaf-privacy.md?raw";
import grtPrivacy from "./policies/grt-next-bus-privacy.md?raw";
import grtTerms from "./policies/grt-next-bus-terms.md?raw";
import nightPrivacy from "./policies/night-neutralizer-privacy.md?raw";
import pagepackPrivacy from "./policies/pagepack-privacy.md?raw";
import pagepackTerms from "./policies/pagepack-terms.md?raw";

export type PolicyKind = "privacy" | "terms";

export type Policy = {
  /** Path under `/legal`, and the folder this policy's page lives in. */
  slug: string;
  /** `Project.id` in `../projects.ts`. */
  project: string;
  /** How the project is written on the page. */
  projectName: string;
  kind: PolicyKind;
  /** Short label for the index and the in-page links. */
  label: string;
  /** One line, so the index is scannable without opening anything. */
  summary: string;
  /** The original file, in the project's own repository. */
  original: string;
  /** The copy in this repository, relative to `app/legal/`. */
  copy: string;
  markdown: string;
};

const REPOS = {
  pagepack: "https://github.com/xiangthebung/pagepack-extension/blob/main",
  grt: "https://github.com/xiangthebung/grt-bus-time/blob/main",
  night: "https://github.com/xiangthebung/night-neutralizer/blob/main",
  decaf: "https://github.com/xiangthebung/Decaf/blob/main",
};

export const policies: Policy[] = [
  {
    slug: "pagepack/privacy",
    project: "pagepack",
    projectName: "PagePack",
    kind: "privacy",
    label: "PagePack privacy policy",
    summary:
      "What an extension that copies whole websites onto your disk does with them. Short version: they stay there.",
    original: `${REPOS.pagepack}/PRIVACY_POLICY.md`,
    copy: "policies/pagepack-privacy.md",
    markdown: pagepackPrivacy,
  },
  {
    slug: "pagepack/terms",
    project: "pagepack",
    projectName: "PagePack",
    kind: "terms",
    label: "PagePack Pro terms of sale",
    summary: "Plans, cancellation, refunds, and what a page-saver cannot promise to capture.",
    original: `${REPOS.pagepack}/TERMS_OF_SALE.md`,
    copy: "policies/pagepack-terms.md",
    markdown: pagepackTerms,
  },
  {
    slug: "grt-next-bus/privacy",
    project: "grt-next-bus",
    projectName: "GRT Next Bus",
    kind: "privacy",
    label: "GRT Next Bus privacy policy",
    summary:
      "The location one. It is opt-in, it is compared against coordinates already on your device, and it is never sent anywhere.",
    original: `${REPOS.grt}/PRIVACY_POLICY.md`,
    copy: "policies/grt-next-bus-privacy.md",
    markdown: grtPrivacy,
  },
  {
    slug: "grt-next-bus/terms",
    project: "grt-next-bus",
    projectName: "GRT Next Bus",
    kind: "terms",
    label: "GRT Next Bus Pro terms of sale",
    summary:
      "What Pro adds, how to cancel, and a plain warning about trusting a transit feed with a bus you cannot miss.",
    original: `${REPOS.grt}/TERMS_OF_SALE.md`,
    copy: "policies/grt-next-bus-terms.md",
    markdown: grtTerms,
  },
  {
    slug: "decaf/privacy",
    project: "decaf",
    projectName: "Decaf",
    kind: "privacy",
    label: "Decaf privacy policy",
    summary:
      "An extension that rewrites twelve social sites — and any you add yourself — and syncs nothing, on purpose. The list of sites you want calmed says too much to put in an account.",
    original: `${REPOS.decaf}/PRIVACY_POLICY.md`,
    copy: "policies/decaf-privacy.md",
    markdown: decafPrivacy,
  },
  {
    slug: "night-neutralizer/privacy",
    project: "night-neutralizer",
    projectName: "Night Neutralizer",
    kind: "privacy",
    label: "Night Neutralizer privacy policy",
    summary:
      "An extension that runs on every page and makes no network requests at all. The interesting part is what syncs.",
    original: `${REPOS.night}/PRIVACY_POLICY.md`,
    copy: "policies/night-neutralizer-privacy.md",
    markdown: nightPrivacy,
  },
];

export function policyBySlug(slug: string): Policy {
  const found = policies.find((policy) => policy.slug === slug);
  if (!found) throw new Error(`No policy registered for "${slug}"`);
  return found;
}

/** The policies belonging to one project, in the order they are listed above. */
export function policiesFor(projectId: string): Policy[] {
  return policies.filter((policy) => policy.project === projectId);
}
