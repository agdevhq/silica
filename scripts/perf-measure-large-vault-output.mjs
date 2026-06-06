#!/usr/bin/env node
import { stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const options = parseArgs(process.argv.slice(2));
const nextRoot = path.resolve(
  process.cwd(),
  option("next-root", "docs/.silica/next/.next"),
);

const paths = {
  total: nextRoot,
  serverApp: path.join(nextRoot, "server/app"),
  standaloneServerApp: path.join(
    nextRoot,
    "standalone/docs/.silica/next/.next/server/app",
  ),
  standalone: path.join(nextRoot, "standalone"),
};

const entries = Object.entries(paths);
for (const [label, directory] of entries) {
  const stats = await summarize(directory);
  if (!stats.exists) {
    console.log(
      `${label}: missing (${path.relative(process.cwd(), directory)})`,
    );
    continue;
  }
  console.log(`${label}: ${formatBytes(stats.bytes)} (${stats.files} files)`);
}

const serverApp = await summarize(paths.serverApp);
if (serverApp.exists) {
  const byExtension = [...serverApp.byExtension.entries()].sort(
    (left, right) => right[1].bytes - left[1].bytes,
  );
  console.log("\nserver/app by extension:");
  for (const [extension, stats] of byExtension.slice(0, 10)) {
    console.log(
      `${extension.padEnd(8)} ${formatBytes(stats.bytes).padStart(10)} ${
        stats.files
      } files`,
    );
  }
}

async function summarize(directory) {
  try {
    const directoryStats = await stat(directory);
    if (!directoryStats.isDirectory()) {
      return { exists: false, bytes: 0, files: 0, byExtension: new Map() };
    }
  } catch {
    return { exists: false, bytes: 0, files: 0, byExtension: new Map() };
  }

  const { readdir } = await import("node:fs/promises");
  const byExtension = new Map();
  let bytes = 0;
  let files = 0;
  const stack = [directory];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const children = await readdir(current, { withFileTypes: true });
    for (const child of children) {
      const childPath = path.join(current, child.name);
      if (child.isDirectory()) {
        stack.push(childPath);
        continue;
      }
      if (!child.isFile()) continue;

      const childStats = await stat(childPath);
      const extension = path.extname(child.name) || "<none>";
      const bucket = byExtension.get(extension) ?? { bytes: 0, files: 0 };
      bucket.bytes += childStats.size;
      bucket.files += 1;
      byExtension.set(extension, bucket);
      bytes += childStats.size;
      files += 1;
    }
  }

  return { exists: true, bytes, files, byExtension };
}

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

function formatBytes(bytes) {
  const units = ["B", "KiB", "MiB", "GiB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
