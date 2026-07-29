/**
 * A markdown renderer for exactly the markdown in `./policies/`.
 *
 * Not a general one, and deliberately not a dependency. The input is five files
 * in this repository whose syntax is known: an H1, `##` headings, paragraphs,
 * `-` lists, one table, and inline bold, code and links. Anything outside that
 * set is rendered as plain text rather than guessed at, which is the right
 * failure for a legal document — a policy that silently drops a clause because a
 * parser did not recognise it would be worse than one that shows the asterisks.
 *
 * No `dangerouslySetInnerHTML` anywhere. Every node below is a real element, so
 * there is no path from the markdown to injected markup even if one of these
 * files were ever generated from something less trustworthy.
 */

import type { ReactNode } from "react";

/* -------------------------------- inline ---------------------------------- */

/**
 * Splits a line into `**bold**`, `` `code` ``, `[text](url)` and plain runs.
 *
 * The bold and link bodies are parsed again, so `**`chrome.storage.sync`**` and
 * `[a **bold** link](url)` come out right. Two things keep that from running
 * away: bold matches lazily, so its body can never contain another `**`, and a
 * code span's body is taken literally, which is what a code span means.
 *
 * The strict-looking `[^*]` in the *first* attempt was tried and removed. It made
 * a policy that wrapped a URL glob in bold render its asterisks as text — the
 * kind of failure a reader would read straight past.
 */
const INLINE = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let index = 0;

  for (const match of text.matchAll(INLINE)) {
    const at = match.index ?? 0;
    if (at > cursor) nodes.push(text.slice(cursor, at));

    const key = `${keyPrefix}-${index++}`;
    const [, bold, code, linkText, href] = match;

    if (bold !== undefined) {
      nodes.push(<strong key={key}>{inline(bold, `${key}s`)}</strong>);
    } else if (code !== undefined) {
      nodes.push(<code key={key}>{code}</code>);
    } else if (linkText !== undefined && href !== undefined) {
      const external = /^https?:\/\//.test(href);
      nodes.push(
        <a
          key={key}
          href={href}
          {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
        >
          {inline(linkText, `${key}l`)}
        </a>,
      );
    }

    cursor = at + match[0].length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

/* --------------------------------- blocks --------------------------------- */

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] };

const isTableRow = (line: string) => line.startsWith("|") && line.endsWith("|");
const isTableRule = (line: string) => /^\|[\s|:-]+\|$/.test(line);
const tableCells = (line: string) =>
  line
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());

/** Groups lines into blocks. Blank lines end whatever was open. */
export function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const closeParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };
  const closeList = () => {
    if (list.length === 0) return;
    blocks.push({ kind: "list", items: list });
    list = [];
  };
  const closeAll = () => {
    closeParagraph();
    closeList();
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();

    if (line === "") {
      closeAll();
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      closeAll();
      blocks.push({
        kind: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      });
      continue;
    }

    if (line.startsWith("- ")) {
      closeParagraph();
      list.push(line.slice(2));
      continue;
    }

    // A table is a header row, a separator, then rows, all adjacent.
    if (isTableRow(line) && isTableRule(lines[index + 1]?.trim() ?? "")) {
      closeAll();
      const head = tableCells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && isTableRow(lines[index].trim())) {
        rows.push(tableCells(lines[index].trim()));
        index++;
      }
      index--;
      blocks.push({ kind: "table", head, rows });
      continue;
    }

    closeList();
    paragraph.push(line);
  }

  closeAll();
  return blocks;
}

/**
 * Renders parsed markdown.
 *
 * `skipTitle` drops the leading H1, because the page already shows the title in
 * its own header and two of them would just be a repeated line.
 */
export function Markdown({
  source,
  skipTitle = false,
}: {
  source: string;
  skipTitle?: boolean;
}) {
  let blocks = parseBlocks(source);
  if (skipTitle && blocks[0]?.kind === "heading" && blocks[0].level === 1) {
    blocks = blocks.slice(1);
  }

  return (
    <>
      {blocks.map((block, index) => {
        const key = `b${index}`;

        if (block.kind === "heading") {
          const content = inline(block.text, key);
          if (block.level === 1) return <h1 key={key}>{content}</h1>;
          if (block.level === 2) return <h2 key={key}>{content}</h2>;
          return <h3 key={key}>{content}</h3>;
        }

        if (block.kind === "list") {
          return (
            <ul key={key}>
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`}>{inline(item, `${key}-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }

        if (block.kind === "table") {
          return (
            <div className="legal-table-wrap" key={key}>
              <table>
                <thead>
                  <tr>
                    {block.head.map((cell, cellIndex) => (
                      <th key={`${key}-h${cellIndex}`} scope="col">
                        {inline(cell, `${key}-h${cellIndex}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`${key}-r${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={`${key}-r${rowIndex}c${cellIndex}`}>
                          {inline(cell, `${key}-r${rowIndex}c${cellIndex}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return <p key={key}>{inline(block.text, key)}</p>;
      })}
    </>
  );
}
