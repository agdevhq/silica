#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const options = parseArgs(process.argv.slice(2));
const outDir = path.resolve(process.cwd(), option("out", "content-large"));
const noteCount = numberOption("notes", 1200);
const paragraphsPerNote = numberOption("paragraphs", 8);

if (noteCount < 1000) {
  throw new Error("Use at least 1000 notes to keep this fixture meaningful.");
}

if (!isSafeOutputDirectory(outDir)) {
  throw new Error(`Refusing to replace unsafe output directory: ${outDir}`);
}

const sections = 12;
const areas = 8;
const topics = 6;
const layers = 4;
const leafNotes = Array.from({ length: noteCount }, (_, index) =>
  makeNotePath(index),
);

await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

await writeFile(
  "index.md",
  [
    "---",
    "title: Large Vault Fixture",
    "description: Synthetic Silica vault for testing render and build performance.",
    "tags:",
    "  - perf",
    "  - perf/large-vault",
    "---",
    "",
    "# Large Vault Fixture",
    "",
    `This generated vault contains ${noteCount} leaf notes plus nested index pages.`,
    "",
    "## Entry points",
    "",
    ...range(sections).map(
      (section) =>
        `- [[${sectionPath(section)}/index|Domain ${pad(section, 2)}]]`,
    ),
    "",
    "## High fan-in targets",
    "",
    "- [[00_hubs/project-hub|Project hub]]",
    "- [[00_hubs/shared-glossary|Shared glossary]]",
  ].join("\n"),
);

await writeFile(
  "00_hubs/project-hub.md",
  hubContent(
    "Project Hub",
    "Central page linked from every generated note to create backlink fan-in.",
  ),
);

await writeFile(
  "00_hubs/shared-glossary.md",
  hubContent(
    "Shared Glossary",
    "Shared terms linked from generated notes across the nested hierarchy.",
  ),
);

for (const section of range(sections)) {
  await writeSectionIndex(section);
  for (const area of range(areas)) {
    await writeAreaIndex(section, area);
    for (const topic of range(topics)) {
      await writeTopicIndex(section, area, topic);
    }
  }
}

for (const note of leafNotes) {
  await writeFile(note.filePath, noteContent(note));
}

console.log(
  `Generated ${noteCount} leaf notes in ${path.relative(process.cwd(), outDir)}.`,
);

function parseArgs(args) {
  const parsed = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const [key, inlineValue] = arg.slice(2).split("=", 2);
    const nextValue = args[index + 1];
    if (inlineValue !== undefined) {
      parsed.set(key, inlineValue);
    } else if (nextValue && !nextValue.startsWith("--")) {
      parsed.set(key, nextValue);
      index += 1;
    } else {
      parsed.set(key, "true");
    }
  }
  return parsed;
}

function option(name, fallback) {
  return options.get(name) ?? fallback;
}

function numberOption(name, fallback) {
  const value = Number(option(name, String(fallback)));
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${name} must be a positive integer.`);
  }
  return value;
}

function isSafeOutputDirectory(directory) {
  const relative = path.relative(process.cwd(), directory);
  return (
    relative &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative) &&
    path.basename(directory) !== "content"
  );
}

function makeNotePath(index) {
  const section = index % sections;
  const area = Math.floor(index / sections) % areas;
  const topic = Math.floor(index / (sections * areas)) % topics;
  const layer = Math.floor(index / (sections * areas * topics)) % layers;
  const title = `Large Vault Note ${pad(index, 4)}`;
  const filePath = [
    sectionPath(section),
    areaPath(area),
    topicPath(topic),
    layerPath(layer),
    `note-${pad(index, 4)}.md`,
  ].join("/");
  const slug = filePath.replace(/\.md$/, "");
  return { index, section, area, topic, layer, title, filePath, slug };
}

async function writeSectionIndex(section) {
  await writeFile(
    `${sectionPath(section)}/index.md`,
    indexPage({
      title: `Domain ${pad(section, 2)}`,
      tags: [`perf/domain-${pad(section, 2)}`],
      links: range(areas).map(
        (area) =>
          `[[${sectionPath(section)}/${areaPath(area)}/index|Area ${pad(
            area,
            2,
          )}]]`,
      ),
    }),
  );
}

async function writeAreaIndex(section, area) {
  await writeFile(
    `${sectionPath(section)}/${areaPath(area)}/index.md`,
    indexPage({
      title: `Domain ${pad(section, 2)} Area ${pad(area, 2)}`,
      tags: [`perf/domain-${pad(section, 2)}`, `perf/area-${pad(area, 2)}`],
      links: range(topics).map(
        (topic) =>
          `[[${sectionPath(section)}/${areaPath(area)}/${topicPath(
            topic,
          )}/index|Topic ${pad(topic, 2)}]]`,
      ),
    }),
  );
}

async function writeTopicIndex(section, area, topic) {
  const prefix = `${sectionPath(section)}/${areaPath(area)}/${topicPath(topic)}`;
  const topicNotes = leafNotes
    .filter(
      (note) =>
        note.section === section && note.area === area && note.topic === topic,
    )
    .slice(0, 12);

  await writeFile(
    `${prefix}/index.md`,
    indexPage({
      title: `Domain ${pad(section, 2)} Area ${pad(area, 2)} Topic ${pad(
        topic,
        2,
      )}`,
      tags: [
        `perf/domain-${pad(section, 2)}`,
        `perf/area-${pad(area, 2)}`,
        `perf/topic-${pad(topic, 2)}`,
      ],
      links: topicNotes.map((note) => `[[${note.slug}|${note.title}]]`),
    }),
  );
}

function indexPage({ title, tags, links }) {
  return [
    "---",
    `title: ${title}`,
    "description: Nested index page for the large vault performance fixture.",
    "tags:",
    ...tags.map((tag) => `  - ${tag}`),
    "---",
    "",
    `# ${title}`,
    "",
    "This page intentionally adds nested navigation depth and link fan-out.",
    "",
    ...links.map((link) => `- ${link}`),
    "",
    "Common targets: [[00_hubs/project-hub|Project hub]], [[00_hubs/shared-glossary|Shared glossary]].",
  ].join("\n");
}

function noteContent(note) {
  const previous =
    leafNotes[(note.index + leafNotes.length - 1) % leafNotes.length];
  const next = leafNotes[(note.index + 1) % leafNotes.length];
  const far = leafNotes[(note.index * 37 + 101) % leafNotes.length];
  const sibling = leafNotes.find(
    (candidate) =>
      candidate.index !== note.index &&
      candidate.section === note.section &&
      candidate.area === note.area &&
      candidate.topic === note.topic,
  );
  const topicIndex = `${sectionPath(note.section)}/${areaPath(
    note.area,
  )}/${topicPath(note.topic)}/index`;
  const relatedLinks = [
    `- Previous: [[${previous.slug}|${previous.title}]]`,
    `- Next: [[${next.slug}|${next.title}]]`,
    `- Far link: [[${far.slug}|${far.title}]]`,
    sibling ? `- Sibling: [[${sibling.slug}|${sibling.title}]]` : undefined,
    "- Shared glossary: [[00_hubs/shared-glossary|Shared glossary]]",
  ].filter((link) => link !== undefined);

  return [
    "---",
    `title: ${note.title}`,
    `description: Synthetic performance note ${note.index}.`,
    "tags:",
    "  - perf/large-vault",
    `  - perf/domain-${pad(note.section, 2)}`,
    `  - perf/area-${pad(note.area, 2)}`,
    `  - perf/topic-${pad(note.topic, 2)}`,
    `  - perf/layer-${pad(note.layer, 2)}`,
    "---",
    "",
    `# ${note.title}`,
    "",
    `This note belongs to [[${topicIndex}|its topic index]] and links back to [[00_hubs/project-hub|Project hub]].`,
    "",
    "## Related notes",
    "",
    ...relatedLinks,
    "",
    "## Body",
    "",
    ...range(paragraphsPerNote).map((paragraph) =>
      paragraphText(note, paragraph),
    ),
  ].join("\n");
}

function hubContent(title, description) {
  return [
    "---",
    `title: ${title}`,
    `description: ${description}`,
    "tags:",
    "  - perf/hub",
    "---",
    "",
    `# ${title}`,
    "",
    description,
    "",
    ...range(sections).map(
      (section) =>
        `- [[${sectionPath(section)}/index|Domain ${pad(section, 2)}]]`,
    ),
  ].join("\n");
}

function paragraphText(note, paragraph) {
  const terms = [
    "manifest",
    "graph",
    "backlink",
    "breadcrumb",
    "navigation",
    "cache",
    "serialization",
    "worker",
    "static",
    "render",
    "hierarchy",
    "obsidian",
  ];
  const words = range(90)
    .map((offset) => terms[(note.index + paragraph + offset) % terms.length])
    .join(" ");

  return `Paragraph ${paragraph + 1}. Domain ${pad(note.section, 2)}, area ${pad(
    note.area,
    2,
  )}, topic ${pad(note.topic, 2)}, layer ${pad(
    note.layer,
    2,
  )}. ${words}. Unique token fixture-${pad(note.index, 4)}-${pad(
    paragraph,
    2,
  )}.`;
}

async function writeFile(relativePath, contents) {
  const filePath = path.join(outDir, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${contents}\n`);
}

function range(length) {
  return Array.from({ length }, (_, index) => index);
}

function pad(value, length) {
  return String(value).padStart(length, "0");
}

function sectionPath(section) {
  return `${pad(section + 1, 2)}_domain-${pad(section, 2)}`;
}

function areaPath(area) {
  return `${pad(area + 1, 2)}_area-${pad(area, 2)}`;
}

function topicPath(topic) {
  return `${pad(topic + 1, 2)}_topic-${pad(topic, 2)}`;
}

function layerPath(layer) {
  return `${pad(layer + 1, 2)}_layer-${pad(layer, 2)}`;
}
