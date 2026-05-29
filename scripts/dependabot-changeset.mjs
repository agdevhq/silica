import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import writeChangeset from "@changesets/write";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const baseRef = process.env.BASE_REF ?? "main";
const runtimeFields = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
];

function git(args) {
  return execSync(`git ${args}`, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function displayVersion(range) {
  return range.replace(/^[\^~>=<]+/, "").split(" ")[0];
}

function isPublishable(manifest) {
  return (
    manifest.private !== true && manifest.publishConfig?.access === "public"
  );
}

function readManifestAt(ref, filePath) {
  try {
    return JSON.parse(git(`show ${ref}:${filePath}`));
  } catch {
    return null;
  }
}

function runtimeDependencyChanges(baseManifest, headManifest) {
  const bumps = [];

  for (const field of runtimeFields) {
    const baseDeps = baseManifest[field] ?? {};
    const headDeps = headManifest[field] ?? {};

    for (const [name, headRange] of Object.entries(headDeps)) {
      const baseRange = baseDeps[name];
      if (baseRange !== headRange) {
        bumps.push({ name, version: displayVersion(headRange) });
      }
    }
  }

  return bumps;
}

function summarizeBumps(bumps) {
  const unique = [];
  const seen = new Set();

  for (const bump of bumps) {
    const key = `${bump.name}@${bump.version}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(bump);
  }

  if (unique.length === 0) return "";
  if (unique.length === 1) {
    return `Bump ${unique[0].name} to ${unique[0].version}.`;
  }

  return `Bump ${unique.map((bump) => `${bump.name} to ${bump.version}`).join(", ")}.`;
}

async function hasExistingChangeset() {
  const added = git(`diff --name-only ${baseRef}...HEAD -- .changeset`)
    .split("\n")
    .filter(Boolean);
  return added.some(
    (file) => file.endsWith(".md") && !file.endsWith("README.md"),
  );
}

async function main() {
  git(`fetch origin ${baseRef}:${baseRef}`);

  if (await hasExistingChangeset()) {
    console.log("Changeset already present on this branch.");
    return;
  }

  const changedFiles = git(`diff --name-only ${baseRef}...HEAD`)
    .split("\n")
    .filter(Boolean);

  const changedManifests = changedFiles.filter(
    (file) =>
      file === "package.json" || /^packages\/[^/]+\/package\.json$/.test(file),
  );

  const packagesToPatch = new Set();
  const allBumps = [];

  for (const filePath of changedManifests) {
    const headManifest = JSON.parse(
      await fs.readFile(path.join(repoRoot, filePath), "utf8"),
    );
    const baseManifest = readManifestAt(baseRef, filePath) ?? {};

    if (!isPublishable(headManifest)) continue;

    const bumps = runtimeDependencyChanges(baseManifest, headManifest);
    if (bumps.length === 0) continue;

    packagesToPatch.add(headManifest.name);
    allBumps.push(...bumps);
  }

  if (packagesToPatch.size === 0) {
    console.log(
      "No publishable runtime dependency changes; creating empty changeset.",
    );
    execSync("npx changeset --empty", { cwd: repoRoot, stdio: "inherit" });
    return;
  }

  const summary = summarizeBumps(allBumps);
  const releases = [...packagesToPatch]
    .sort()
    .map((name) => ({ name, type: "patch" }));

  await writeChangeset({ summary, releases }, repoRoot);
  console.log(
    `Created patch changeset for: ${[...packagesToPatch].join(", ")}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
