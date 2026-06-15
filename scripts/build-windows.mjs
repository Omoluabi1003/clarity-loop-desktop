import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
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

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const build = spawnSync(npmCommand, ["exec", "tauri", "build", "--", "--bundles", "nsis,msi"], {
  cwd: root,
  stdio: "inherit",
  shell: false
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
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

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const installers = [
  { extension: ".exe", name: "ClarityLoopSetup.exe", required: true },
  { extension: ".msi", name: "ClarityLoop.msi", required: false }
];

for (const installer of installers) {
  const matches = await findFiles(targetDir, installer.extension);
  if (matches.length === 0) {
    if (installer.required) throw new Error(`No ${installer.extension} installer was generated.`);
    console.warn(`No ${installer.extension} installer was generated; continuing without it.`);
    continue;
  }
  if (matches.length > 1) {
    throw new Error(`Expected one ${installer.extension} installer, found ${matches.length}.`);
  }
  await cp(matches[0], path.join(outputDir, installer.name));
  console.log(`Prepared ${installer.name}`);
}
