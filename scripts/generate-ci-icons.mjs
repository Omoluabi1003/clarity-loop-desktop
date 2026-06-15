import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";

if (process.env.GITHUB_ACTIONS !== "true") {
  throw new Error("Placeholder icons may only be generated inside GitHub Actions.");
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconDirectory = path.join(root, "src-tauri", "icons");

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function createPng(size) {
  const rows = Buffer.alloc((size * 4 + 1) * size);
  const center = (size - 1) / 2;
  const outerRadius = size * 0.42;
  const innerRadius = size * 0.25;

  for (let y = 0; y < size; y += 1) {
    const rowOffset = y * (size * 4 + 1);
    for (let x = 0; x < size; x += 1) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const distance = Math.hypot(x - center, y - center);
      const onLoop = distance <= outerRadius && distance >= innerRadius;
      const onSpark =
        Math.abs(x - center) <= size * 0.045 || Math.abs(y - center) <= size * 0.045;
      const visible = onLoop || (onSpark && distance <= size * 0.16);

      rows[pixelOffset] = visible ? 42 : 0;
      rows[pixelOffset + 1] = visible ? 203 : 0;
      rows[pixelOffset + 2] = visible ? 183 : 0;
      rows[pixelOffset + 3] = visible ? 255 : 0;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(rows, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function createIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry[0] = size === 256 ? 0 : size;
    entry[1] = size === 256 ? 0 : size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

await mkdir(iconDirectory, { recursive: true });

const png32 = createPng(32);
const png128 = createPng(128);
const png256 = createPng(256);
const files = new Map([
  ["32x32.png", png32],
  ["128x128.png", png128],
  ["128x128@2x.png", png256],
  [
    "icon.ico",
    createIco([
      { size: 32, data: png32 },
      { size: 128, data: png128 },
      { size: 256, data: png256 }
    ])
  ]
]);

for (const [name, data] of files) {
  await writeFile(path.join(iconDirectory, name), data);
  console.log(`Generated src-tauri/icons/${name}`);
}
