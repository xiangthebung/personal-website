/**
 * The shell around every `/legal` page.
 *
 * Its whole job is to be quiet. The home page is a long scroll of running
 * software with ambient motion behind it; that is the wrong room for a document
 * someone opened because they want to know what happens to their location. This
 * layout gives that document a plain page, a readable measure, and one way back.
 */

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <main className="legal-shell">{children}</main>;
}
