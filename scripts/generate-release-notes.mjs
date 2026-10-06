import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [tag, repository, artifactsDirectory, outputDirectory] =
  process.argv.slice(2);

if (!tag || !repository || !artifactsDirectory || !outputDirectory) {
  throw new Error(
    "Usage: node generate-release-notes.mjs <tag> <owner/repo> <artifacts-dir> <output-dir>",
  );
}

const app = "simple-prayertime-reminder";
const version = tag.replace(/^v/, "");
const artifactsRoot = path.resolve(artifactsDirectory);
const outputRoot = path.resolve(outputDirectory);
const assetsRoot = path.join(outputRoot, "assets");
const notesPath = path.join(outputRoot, "release-notes.md");
const internalAssetNames = new Set([
  "Assets.car",
  "CodeResources",
  "icons.icns",
  "Info.plist",
  "MicrosoftEdgeWebview2Setup.exe",
]);

function git(...args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) return "";
  return result.stdout.trim();
}

function getPreviousTag() {
  return git(
    "describe",
    "--tags",
    "--abbrev=0",
    "--match",
    "v[0-9]*",
    `${tag}^`,
  );
}

function humanSize(bytes) {
  if (bytes >= 1_000_000)
    return `${Number((bytes / 1_000_000).toPrecision(3))} MB`;
  if (bytes >= 1_000) return `${Number((bytes / 1_000).toPrecision(3))} KB`;
  return `${bytes} B`;
}

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(fullPath);
    else if (entry.isFile()) yield fullPath;
  }
}

async function sha256(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

function artifactTarget(filePath) {
  const relativeParts = path.relative(artifactsRoot, filePath).split(path.sep);
  const artifactName =
    relativeParts.find((part) =>
      /^(linux|windows|macos)-(amd64|arm64)-/.test(part),
    ) || "";
  const match = artifactName.match(/^(linux|windows|macos)-(amd64|arm64)-/);
  const fileName = path.basename(filePath);
  const isInternal =
    internalAssetNames.has(fileName) ||
    relativeParts.some((part) => part.endsWith(".app"));
  return {
    platform: match?.[1] ?? "other",
    architecture: match?.[2] ?? "",
    group: isInternal
      ? "internal"
      : match
        ? `${match[1]}-${match[2]}`
        : "other",
    fileName,
  };
}

function uniqueName(fileName, platform, architecture, existingNames) {
  const extension = path.extname(fileName);
  const stem = fileName.slice(0, fileName.length - extension.length);
  const suffix =
    [platform, architecture].filter(Boolean).join("-") || "additional";
  let result = `${stem}-${suffix}${extension}`;
  let index = 2;
  while (existingNames.has(result))
    result = `${stem}-${suffix}-${index++}${extension}`;
  return result;
}

function displayGroup(group) {
  const headings = {
    "windows-amd64": "### 🪟 Windows (amd64)",
    "windows-arm64": "### 🪟 Windows (arm64)",
    "linux-amd64": "### 🐧 Linux (amd64)",
    "linux-arm64": "### 🐧 Linux (arm64)",
    "macos-amd64": "### 🍎 macOS (amd64 / Intel)",
    "macos-arm64": "### 🍎 macOS (arm64 / Apple Silicon)",
    internal: "### 📦 Internal Assets",
    other: "### 📦 Additional Downloads",
  };
  return headings[group] ?? headings.other;
}

function commitBullet(subject) {
  const match = subject.match(
    /^(feat|fix|refactor|docs|perf|test|build|chore)(?:\([^)]*\))?!?:\s*(.*)$/i,
  );
  if (!match) return `- ${subject}`;
  const labels = {
    feat: "Feature",
    fix: "Fix",
    refactor: "Refactor",
    docs: "Docs",
    perf: "Performance",
    test: "Test",
    build: "Build",
    chore: "Maintenance",
  };
  const summary = match[2].charAt(0).toUpperCase() + match[2].slice(1);
  return `- ${labels[match[1].toLowerCase()]}: ${summary}`;
}

const previousTag = getPreviousTag();
const commitRange = previousTag ? `${previousTag}..${tag}` : tag;
const commits = git("log", "--no-merges", "--format=%s", commitRange)
  .split("\n")
  .filter((subject) => subject && !/^bump version to\s/i.test(subject));

await rm(outputRoot, { recursive: true, force: true });
await mkdir(assetsRoot, { recursive: true });

const files = [];
for await (const filePath of walk(artifactsRoot)) files.push(filePath);
files.sort((a, b) => a.localeCompare(b));
if (files.length === 0)
  throw new Error(`No release assets found in ${artifactsRoot}`);

const assets = [];
const byName = new Map();
for (const filePath of files) {
  const target = artifactTarget(filePath);
  const digest = await sha256(filePath);
  const previous = byName.get(target.fileName);
  if (previous?.digest === digest) continue;

  let fileName = target.fileName;
  if (previous || byName.has(fileName))
    fileName = uniqueName(
      fileName,
      target.platform,
      target.architecture,
      byName,
    );
  const destination = path.join(assetsRoot, fileName);
  await copyFile(filePath, destination);
  const details = await stat(destination);
  const asset = { ...target, fileName, digest, size: details.size };
  assets.push(asset);
  byName.set(fileName, asset);
}

await writeFile(
  path.join(assetsRoot, "SHA256SUMS"),
  `${assets.map(({ digest, fileName }) => `${digest}  ${fileName}`).join("\n")}\n`,
  "utf8",
);

const compare = previousTag ? `${previousTag}...${tag}` : tag;
const changelog = commits.length
  ? commits.map(commitBullet).join("\n")
  : "- No changelog entries were found.";
const body = [
  `# Release ${tag}`,
  "",
  "Changelog:",
  changelog,
  "",
  `## Downloads — ${tag}`,
  "",
  `> This release is compiled using [GitHub CI](https://github.com/${repository}/blob/master/.github/workflows/build.yml).`,
  "",
  "If you have git, pnpm, and Go installed, you can install or update easily using this command:",
  "",
  "**Linux / macOS**",
  "",
  "```bash",
  `bash <(curl -fsSL https://raw.githubusercontent.com/${repository}/main/scripts/install.sh)`,
  "```",
  "",
  "**Windows (PowerShell)**",
  "",
  "```powershell",
  `irm https://raw.githubusercontent.com/${repository}/main/scripts/install.ps1 | iex`,
  "```",
  "",
];

const groupOrder = [
  "windows-amd64",
  "windows-arm64",
  "linux-amd64",
  "linux-arm64",
  "macos-amd64",
  "macos-arm64",
  "internal",
  "other",
];
const groups = new Map();
for (const asset of assets) {
  if (!groups.has(asset.group)) groups.set(asset.group, []);
  groups.get(asset.group).push(asset);
}

for (const group of groupOrder) {
  const groupAssets = groups.get(group);
  if (!groupAssets?.length) continue;
  body.push(
    displayGroup(group),
    "",
    "| File | Size | SHA256 |",
    "|------|------|--------|",
  );
  for (const asset of groupAssets.sort((a, b) =>
    a.fileName.localeCompare(b.fileName),
  )) {
    const url = `https://github.com/${repository}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(asset.fileName)}`;
    body.push(
      `| [${asset.fileName}](${url}) | ${humanSize(asset.size)} | \`${asset.digest}\` |`,
    );
  }
  body.push("");
}

body.push(
  `**Full Changelog**: https://github.com/${repository}/compare/${compare}`,
  "",
  `[![Download Simple PrayerTime Reminder](https://a.fsdn.com/con/app/sf-download-button)](https://sourceforge.net/projects/${app}/files/${version}/)`,
  "",
);

await writeFile(notesPath, body.join("\n"), "utf8");
console.log(
  `Generated ${notesPath} and staged ${assets.length} release assets.`,
);
