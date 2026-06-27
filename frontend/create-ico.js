import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const srcPng = path.join(__dirname, 'public', 'logoo.png');
const dest   = path.join(__dirname, 'public', 'app-icon.ico');

const pngData = fs.readFileSync(srcPng);

const entries = [
  { width: 256, height: 256 },
  { width: 128, height: 128 },
  { width: 64,  height: 64  },
  { width: 48,  height: 48  },
  { width: 32,  height: 32  },
  { width: 16,  height: 16  },
];

const N          = entries.length;
const headerSize = 6;
const dirSize    = 16 * N;
const dataOffset = headerSize + dirSize;
const totalSize  = dataOffset + pngData.length * N;
const buf        = Buffer.alloc(totalSize);

// ICO header
buf.writeUInt16LE(0, 0); // reserved
buf.writeUInt16LE(1, 2); // type: 1 = icon
buf.writeUInt16LE(N, 4); // number of images

// Directory entries
let fileOffset = dataOffset;
entries.forEach((e, i) => {
  const base = headerSize + i * 16;
  buf.writeUInt8(e.width  === 256 ? 0 : e.width,  base + 0);
  buf.writeUInt8(e.height === 256 ? 0 : e.height, base + 1);
  buf.writeUInt8(0,  base + 2);  // color count
  buf.writeUInt8(0,  base + 3);  // reserved
  buf.writeUInt16LE(1,  base + 4);  // planes
  buf.writeUInt16LE(32, base + 6);  // bits per pixel
  buf.writeUInt32LE(pngData.length, base + 8);   // size of image data
  buf.writeUInt32LE(fileOffset,     base + 12);  // offset to image data
  fileOffset += pngData.length;
});

// Image data
let writePos = dataOffset;
for (let i = 0; i < N; i++) {
  pngData.copy(buf, writePos);
  writePos += pngData.length;
}

fs.writeFileSync(dest, buf);
console.log('✅ ICO cree avec succes:', dest);
console.log('   Taille:', (buf.length / 1024).toFixed(1), 'KB');
