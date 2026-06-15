import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetDir = path.join(root, "src-tauri", "target", "release", "bundle");
const outputDir = path.join(root, "dist", "windows");

if (process.platform !== "win32") {
  console.error("The Windows packaging script must run on a Windows host.");
  process.exit(1);
}

async function findFiles(directory, extension) {
  const matches = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) matches.push(...(await findFiles(entryPath, extension)));
    else if (entry.name.toLowerCase().endsWith(extension)) matches.push(entryPath);
  }
  return matches;
}

async function listDirectory(directory, indent = "") {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    console.error(`${indent}${directory}: ${error.message}`);
    return;
  }

  if (entries.length === 0) {
    console.error(`${indent}${directory} (empty)`);
    return;
  }

  console.error(`${indent}${directory}`);
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    console.error(`${indent}  ${entry.isDirectory() ? "[dir]" : "[file]"} ${entry.name}`);
    if (entry.isDirectory()) await listDirectory(entryPath, `${indent}  `);
  }
}

async function reportMissingInstaller() {
  console.error(`No NSIS .exe installer was found under ${targetDir}.`);
  console.error(
    "Confirm that `npm run tauri:build -- --bundles nsis` completed successfully before normalization."
  );
  console.error("Bundle directory listing:");
  await listDirectory(targetDir);
  console.error("Release directory listing:");
  await listDirectory(path.dirname(targetDir));
  throw new Error("Required NSIS Windows installer was not generated.");
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

let matches = [];
try {
  matches = await findFiles(targetDir, ".exe");
} catch (error) {
  console.error(`Unable to search the Tauri bundle directory: ${error.message}`);
}

if (matches.length === 0) {
  await reportMissingInstaller();
}
if (matches.length > 1) {
  console.error("Found multiple NSIS .exe installers:");
  for (const match of matches) console.error(`  ${match}`);
  throw new Error(`Expected one NSIS .exe installer, found ${matches.length}.`);
}

await cp(matches[0], path.join(outputDir, "ClarityLoopSetup.exe"));
console.log("Prepared ClarityLoopSetup.exe");
