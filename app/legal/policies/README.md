# Do not edit these files here

Every file in this directory is a copy. The original of each lives in the
repository of the project it belongs to, next to the code it describes:

| file | original |
| --- | --- |
| `pagepack-privacy.md` | `pagepack-extension/PRIVACY_POLICY.md` |
| `pagepack-terms.md` | `pagepack-extension/TERMS_OF_SALE.md` |
| `grt-next-bus-privacy.md` | `grt-bus-time/PRIVACY_POLICY.md` |
| `grt-next-bus-terms.md` | `grt-bus-time/TERMS_OF_SALE.md` |
| `night-neutralizer-privacy.md` | `night-neutralizer/PRIVACY_POLICY.md` |
| `decaf-privacy.md` | `Decaf/PRIVACY_POLICY.md` |

They are copied rather than read from the sibling checkout because this site
deploys on its own, without those repositories present.

A policy has to be reachable at a URL — the Chrome Web Store asks for one — and
it also has to sit in the repository of the thing it governs, versioned with the
code that makes its claims true. So there are two copies, and
`tests/rendered-html.test.mjs` diffs them against the originals whenever the
sibling repositories happen to be checked out beside this one. Edit the original;
the test will tell you to bring the copy along.
