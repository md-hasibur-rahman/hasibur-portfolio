type Block = { kind: "p"; text: string } | { kind: "ul"; items: string[] };
type Section = { heading: string | null; blocks: Block[] };

// Case-study body text is stored as plain markdown-lite (`## ` headings, `- ` bullets, blank line
// between paragraphs) and rendered as text nodes, so nothing from the database becomes markup.
function parse(content: string): Section[] {
  const sections: Section[] = [];
  let current: Section = { heading: null, blocks: [] };
  let paragraph: string[] = [];
  let items: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      current.blocks.push({ kind: "p", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushItems = () => {
    if (items.length > 0) {
      current.blocks.push({ kind: "ul", items });
      items = [];
    }
  };
  const flushSection = () => {
    if (current.heading !== null || current.blocks.length > 0) {
      sections.push(current);
      current = { heading: null, blocks: [] };
    }
  };

  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      flushParagraph();
      flushItems();
      flushSection();
      current = { heading: line.slice(3).trim(), blocks: [] };
    } else if (line === "") {
      flushParagraph();
      flushItems();
    } else if (line.startsWith("- ")) {
      flushParagraph();
      items.push(line.slice(2).trim());
    } else {
      flushItems();
      paragraph.push(line);
    }
  }

  flushParagraph();
  flushItems();
  flushSection();
  return sections;
}

export function Prose({ content }: { content: string }) {
  const sections = parse(content);
  if (sections.length === 0) return null;

  return (
    <div className="flex flex-col gap-10">
      {sections.map((section, sectionIndex) => (
        <section className="flex flex-col gap-4" key={sectionIndex}>
          {section.heading ? (
            <h2 className="flex flex-col gap-2 text-lg font-semibold tracking-tight sm:text-xl">
              <span aria-hidden className="h-px w-10 bg-navy-400 dark:bg-navy-600" />
              {section.heading}
            </h2>
          ) : null}
          {section.blocks.map((block, blockIndex) =>
            block.kind === "ul" ? (
              <ul className="flex flex-col gap-2.5" key={blockIndex}>
                {block.items.map((item, itemIndex) => (
                  <li
                    className="flex gap-3 text-[0.95rem] leading-relaxed text-muted-foreground"
                    key={itemIndex}
                  >
                    <span aria-hidden className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-navy-400 dark:bg-navy-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p
                className="max-w-prose text-[0.95rem] leading-[1.8] text-muted-foreground"
                key={blockIndex}
              >
                {block.text}
              </p>
            ),
          )}
        </section>
      ))}
    </div>
  );
}
